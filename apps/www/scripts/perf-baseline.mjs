#!/usr/bin/env node
/**
 * Repeatable www performance baseline (PROD-2760): crawl + RSC + media + Lighthouse.
 * Reproduces the tables posted on PROD-2752 against any base URL.
 *
 * Usage:
 *   pnpm --filter @pakfactory/www perf:baseline --base https://staging.pakfactory.com
 *   pnpm --filter @pakfactory/www perf:baseline --base http://localhost:3000 --skip-lighthouse
 *
 * Options:
 *   --base <url>         Required. Site to measure (no default, on purpose).
 *   --out <dir>          Output folder. Default: <os tmp>/pf-perf-baseline/<timestamp>
 *   --pages <a,b,...>    Lighthouse / RSC / media pages. Default: the 14 baseline pages.
 *   --max-urls <n>       Crawl cap. Default 400.
 *   --concurrency <n>    Parallel crawl requests, 1–3. Default 3 (more trips the Vercel firewall).
 *   --runs <n>           Lighthouse runs per page and form factor; the summary reports the
 *                        median of each metric. Default 3. Use 1 for a quick check.
 *   --skip-crawl | --skip-rsc | --skip-media | --skip-lighthouse
 *
 * Password-protected deploys (staging): set VERCEL_AUTOMATION_BYPASS_SECRET to the project's
 * "Protection Bypass for Automation" secret. It is sent as the x-vercel-protection-bypass
 * header and never printed. Never pass a login password to this script.
 *
 * Output: results.json + summary.md (paste into a PROD-2752 comment) + lighthouse/*.json.
 * Lighthouse 13 runs through `npx lighthouse@13` and needs a local Chrome.
 */

/* global Buffer, URL, console, performance, process -- Node script; the www ESLint config targets the browser */

import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import http from "node:http";
import https from "node:https";
import os from "node:os";
import path from "node:path";
import zlib from "node:zlib";

const DEFAULT_PAGES = [
  "/",
  "/products",
  "/customizations",
  "/products/box-inserts/cardboard-inserts",
  "/products/1-2-3-bottom-snap-lock-slotted-container",
  "/customizations/additional-customization/adhesive-strip",
  "/solutions",
  "/solutions/apparel-fashion",
  "/solutions/beauty-cosmetics/beauty-product-instruction-care-cards",
  "/case-studies",
  "/case-studies/coca-cola",
  "/expertise/logistics-management",
  "/about",
  "/request",
];

const CRAWL_SKIP =
  /^\/(blog|api|_next|account|login|sign-up|forgot-password|reset-password|verify|case-studies\/api)(\/|$)|\.(png|jpe?g|svg|webp|gif|pdf|ico|xml|txt|mp4)$/i;
const NOT_FOUND_PROBE = "/__perf-baseline-404-probe";
const MAX_CRAWL_DEPTH = 2;

// --- arguments -------------------------------------------------------------

function parseArgs(argv) {
  const opts = {
    base: null,
    out: null,
    pages: DEFAULT_PAGES,
    maxUrls: 400,
    concurrency: 3,
    runs: 3,
    skip: new Set(),
  };
  const takeValue = (i, flag) => {
    const value = argv[i + 1];
    if (value === undefined || value.startsWith("--")) fail(`${flag} needs a value`);
    return value;
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--") continue;
    if (arg === "--help" || arg === "-h") {
      console.log("Usage: perf-baseline.mjs --base <url> [--out <dir>] [--pages a,b] [--max-urls n] [--concurrency 1-3] [--runs n] [--skip-crawl|--skip-rsc|--skip-media|--skip-lighthouse]");
      process.exit(0);
    } else if (arg === "--base") {
      opts.base = takeValue(i++, arg);
    } else if (arg === "--out") {
      opts.out = takeValue(i++, arg);
    } else if (arg === "--pages") {
      opts.pages = takeValue(i++, arg).split(",").map((p) => p.trim()).filter(Boolean);
    } else if (arg === "--max-urls") {
      opts.maxUrls = positiveInt(takeValue(i++, arg), arg);
    } else if (arg === "--concurrency") {
      opts.concurrency = positiveInt(takeValue(i++, arg), arg);
      if (opts.concurrency > 3) fail("--concurrency above 3 trips the Vercel firewall (403 x-vercel-mitigated)");
    } else if (arg === "--runs") {
      opts.runs = positiveInt(takeValue(i++, arg), arg);
    } else if (/^--skip-(crawl|rsc|media|lighthouse)$/.test(arg)) {
      opts.skip.add(arg.slice("--skip-".length));
    } else {
      fail(`unknown argument: ${arg}`);
    }
  }
  if (!opts.base) fail("--base <url> is required (e.g. --base https://staging.pakfactory.com)");
  let url;
  try {
    url = new URL(opts.base);
  } catch {
    fail(`--base is not a URL: ${opts.base}`);
  }
  if (!/^https?:$/.test(url.protocol)) fail("--base must be http(s)");
  opts.base = url.origin;
  for (const page of opts.pages) if (!page.startsWith("/")) fail(`--pages entries must start with "/": ${page}`);
  opts.out ??= path.join(os.tmpdir(), "pf-perf-baseline", new Date().toISOString().replace(/[:.]/g, "-"));
  return opts;
}

function positiveInt(value, flag) {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1) fail(`${flag} must be a positive integer`);
  return n;
}

function fail(message) {
  console.error(`perf-baseline: ${message}`);
  process.exit(1);
}

// --- HTTP ------------------------------------------------------------------

const BYPASS = process.env.VERCEL_AUTOMATION_BYPASS_SECRET ?? "";

function baseHeaders() {
  const headers = { "user-agent": "pf-perf-baseline", "accept-encoding": "br, gzip" };
  if (BYPASS) headers["x-vercel-protection-bypass"] = BYPASS;
  return headers;
}

/** One request, no redirects followed. Times are seconds; sizes are bytes on the wire and decoded. */
function request(url, { method = "GET", headers = {}, keepBody = true } = {}) {
  const client = url.startsWith("https:") ? https : http;
  const started = performance.now();
  return new Promise((resolve) => {
    const req = client.request(url, { method, headers: { ...baseHeaders(), ...headers }, timeout: 60_000 }, (res) => {
      const ttfb = (performance.now() - started) / 1000;
      const chunks = [];
      let wireBytes = 0;
      res.on("data", (chunk) => {
        wireBytes += chunk.length;
        if (keepBody) chunks.push(chunk);
      });
      res.on("end", () => {
        const raw = Buffer.concat(chunks);
        let body = raw;
        try {
          const encoding = res.headers["content-encoding"];
          if (encoding === "br") body = zlib.brotliDecompressSync(raw);
          else if (encoding === "gzip") body = zlib.gunzipSync(raw);
        } catch {
          body = raw;
        }
        resolve({
          status: res.statusCode,
          ttfb,
          total: (performance.now() - started) / 1000,
          wireBytes,
          bodyBytes: keepBody ? body.length : null,
          body: keepBody ? body.toString("utf8") : "",
          headers: res.headers,
        });
      });
    });
    req.on("timeout", () => req.destroy(new Error("timeout")));
    req.on("error", (err) => resolve({ status: -1, error: err.message, ttfb: null, total: null, wireBytes: 0, bodyBytes: 0, body: "", headers: {} }));
    req.end();
  });
}

async function pool(items, size, worker) {
  const results = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(size, items.length) }, async () => {
      while (next < items.length) {
        const index = next++;
        results[index] = await worker(items[index], index);
      }
    }),
  );
  return results;
}

function internalLinks(html) {
  const links = new Set();
  for (const [, href] of html.matchAll(/href="(\/[^"#?]*)/g)) {
    const normalized = href.replace(/\/+$/, "") || "/";
    if (!normalized.startsWith("//") && !CRAWL_SKIP.test(normalized)) links.add(normalized);
  }
  return links;
}

// --- steps -----------------------------------------------------------------

/** Top-level pages plus one level deeper, each fetched twice (first, then warm). */
async function crawl(opts) {
  const seen = new Set(["/"]);
  let frontier = ["/"];
  const rows = [];
  for (let depth = 0; depth <= MAX_CRAWL_DEPTH && frontier.length && rows.length < opts.maxUrls; depth++) {
    const batch = frontier.slice(0, opts.maxUrls - rows.length);
    const nextFrontier = [];
    const fetched = await pool(batch, opts.concurrency, async (pathname) => {
      const first = await request(opts.base + pathname);
      const warm = await request(opts.base + pathname, { keepBody: false });
      return { pathname, first, warm };
    });
    for (const { pathname, first, warm } of fetched) {
      rows.push(crawlRow(pathname, depth, first, warm));
      if (first.status !== 200 || depth === MAX_CRAWL_DEPTH) continue;
      for (const link of internalLinks(first.body)) {
        if (!seen.has(link)) {
          seen.add(link);
          nextFrontier.push(link);
        }
      }
    }
    process.stdout.write(`  crawl depth ${depth}: ${batch.length} URLs (${rows.length} total)\n`);
    frontier = nextFrontier;
  }
  const probe = await request(opts.base + NOT_FOUND_PROBE, { keepBody: false });
  rows.push(crawlRow(NOT_FOUND_PROBE, -1, probe, probe));
  return rows;
}

function crawlRow(pathname, depth, first, warm) {
  return {
    path: pathname,
    depth,
    status: first.status,
    location: first.headers.location ?? null,
    cacheControl: first.headers["cache-control"] ?? null,
    firstCache: first.headers["x-vercel-cache"] ?? null,
    warmCache: warm.headers["x-vercel-cache"] ?? null,
    firstTtfb: first.ttfb,
    warmTtfb: warm.ttfb,
    warmTotal: warm.total,
    wireBytes: first.wireBytes,
    htmlBytes: first.bodyBytes,
  };
}

async function rscPayloads(opts) {
  return pool(opts.pages, opts.concurrency, async (pathname) => {
    const res = await request(opts.base + pathname, { headers: { rsc: "1" } });
    return { path: pathname, status: res.status, contentType: res.headers["content-type"] ?? null, wireBytes: res.wireBytes, rawBytes: res.bodyBytes };
  });
}

async function mediaAudit(opts) {
  const pages = await pool(opts.pages, opts.concurrency, async (pathname) => {
    const res = await request(opts.base + pathname);
    const html = res.body.replaceAll("&amp;", "&");
    // Only markup the browser fetches from. The RSC data in <script> holds bare asset URLs
    // that next/image parameterises at render, and SVGs have nothing to resize.
    const markup = html.replace(/<script\b[\s\S]*?<\/script>/gi, "");
    const attributeUrls = [...markup.matchAll(/\s(?:src|srcset|poster|href)="([^"]+)"/gi)].flatMap(([, value]) =>
      value.split(",").map((candidate) => candidate.trim().split(/\s+/)[0]),
    );
    const rawImages = [...new Set(attributeUrls)].filter(
      (url) => url.startsWith("https://cdn.sanity.io/images/") && !url.includes("?") && !url.endsWith(".svg"),
    );
    const videos = [...new Set(html.match(/https:\/\/cdn\.sanity\.io\/files\/[^"'\s)\\,]+\.mp4/g) ?? [])];
    return { path: pathname, status: res.status, rawImages, videos };
  });
  const videoUrls = [...new Set(pages.flatMap((p) => p.videos))];
  const sizes = await pool(videoUrls, opts.concurrency, async (url) => {
    const res = await request(url, { method: "HEAD", keepBody: false });
    return [url, Number(res.headers["content-length"] ?? 0)];
  });
  return { pages, videoBytes: Object.fromEntries(sizes) };
}

function lighthouse(opts) {
  const dir = path.join(opts.out, "lighthouse");
  mkdirSync(dir, { recursive: true });
  // Headers go through a file so the bypass secret never appears in the process list.
  const headersFile = path.join(opts.out, ".extra-headers.json");
  if (BYPASS) writeFileSync(headersFile, JSON.stringify({ "x-vercel-protection-bypass": BYPASS }), { mode: 0o600 });
  const rows = [];
  try {
    for (const formFactor of ["mobile", "desktop"]) {
      for (const pathname of opts.pages) {
        const slug = pathname === "/" ? "home" : pathname.slice(1).replaceAll("/", "_");
        const runRows = [];
        for (let run = 1; run <= opts.runs; run++) {
          const file = path.join(dir, `${formFactor}_${slug}${opts.runs > 1 ? `_run${run}` : ""}.json`);
          const args = [
            "--yes",
            "lighthouse@13",
            opts.base + pathname,
            "--output=json",
            `--output-path=${file}`,
            "--quiet",
            "--only-categories=performance,accessibility,best-practices,seo",
            "--chrome-flags=--headless=new",
          ];
          if (formFactor === "desktop") args.push("--preset=desktop");
          if (BYPASS) args.push(`--extra-headers=${headersFile}`);
          process.stdout.write(`  lighthouse ${formFactor} ${pathname}${opts.runs > 1 ? ` (${run}/${opts.runs})` : ""}\n`);
          const result = spawnSync("npx", args, { stdio: ["ignore", "ignore", "pipe"], encoding: "utf8" });
          runRows.push(readLighthouse(file, formFactor, pathname, result));
        }
        rows.push(medianRow(runRows));
      }
    }
  } finally {
    rmSync(headersFile, { force: true });
  }
  return rows;
}

function readLighthouse(file, formFactor, pathname, run) {
  const row = { formFactor, path: pathname, error: null };
  try {
    const report = JSON.parse(readFileSync(file, "utf8"));
    const audit = (id) => report.audits[id]?.numericValue ?? null;
    const score = (id) => (report.categories[id]?.score == null ? null : Math.round(report.categories[id].score * 100));
    Object.assign(row, {
      performance: score("performance"),
      accessibility: score("accessibility"),
      bestPractices: score("best-practices"),
      seo: score("seo"),
      fcpMs: audit("first-contentful-paint"),
      lcpMs: audit("largest-contentful-paint"),
      tbtMs: audit("total-blocking-time"),
      cls: audit("cumulative-layout-shift"),
      speedIndexMs: audit("speed-index"),
      transferBytes: audit("total-byte-weight"),
      error: report.runtimeError?.code ?? null,
    });
  } catch {
    row.error = run.status === 0 ? "no report" : (run.stderr || "lighthouse failed").trim().split("\n").at(-1);
  }
  return row;
}

const LIGHTHOUSE_METRICS = ["performance", "accessibility", "bestPractices", "seo", "fcpMs", "lcpMs", "tbtMs", "cls", "speedIndexMs", "transferBytes"];

/** One row per page and form factor: the median of each metric over the runs that succeeded. */
function medianRow(runRows) {
  const ok = runRows.filter((r) => !r.error);
  const row = { formFactor: runRows[0].formFactor, path: runRows[0].path, runs: ok.length, error: null };
  if (!ok.length) return { ...row, error: runRows.at(-1).error };
  for (const key of LIGHTHOUSE_METRICS) row[key] = median(ok.map((r) => r[key]));
  row.perRun = runRows.map((r) => ({ performance: r.performance ?? null, lcpMs: r.lcpMs ?? null, error: r.error }));
  return row;
}

/**
 * Load each measured page and its /_next/static assets once before Lighthouse,
 * so the first measured page does not pay for a cold CDN (seen right after a deploy).
 */
async function warmUp(opts) {
  const assets = new Set();
  await pool(opts.pages, opts.concurrency, async (pathname) => {
    const res = await request(opts.base + pathname);
    for (const [, ref] of res.body.matchAll(/(?:src|href)="(\/_next\/static\/[^"]+)"/g)) assets.add(ref.replaceAll("&amp;", "&"));
  });
  await pool([...assets], opts.concurrency, (ref) => request(opts.base + ref, { keepBody: false }));
  process.stdout.write(`  warmed ${opts.pages.length} pages and ${assets.size} static assets\n`);
}

// --- summary ---------------------------------------------------------------

const median = (values) => {
  const sorted = values.filter((v) => v != null).sort((a, b) => a - b);
  if (!sorted.length) return null;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};
const percentile = (values, p) => {
  const sorted = values.filter((v) => v != null).sort((a, b) => a - b);
  return sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))] : null;
};
const score = (n) => (n == null ? "–" : Math.round(n));
const sec = (s) => (s == null ? "–" : `${s.toFixed(2)} s`);
const kb = (bytes) => (bytes == null ? "–" : `${Math.round(bytes / 1024).toLocaleString("en-US")} KB`);
const mb = (bytes) => (bytes == null ? "–" : bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : kb(bytes));

function summarize(opts, results) {
  const lines = [`## Baseline run: ${results.startedAt.slice(0, 10)} (${opts.base})`, ""];

  if (results.crawl) {
    const pages = results.crawl.filter((r) => r.path !== NOT_FOUND_PROBE);
    const byStatus = Object.entries(Object.groupBy(pages, (r) => r.status)).map(([s, rows]) => `${rows.length} × ${s}`);
    const hits = pages.filter((r) => r.status === 200 && r.warmCache === "HIT").length;
    const ok = pages.filter((r) => r.status === 200);
    const privateCount = ok.filter((r) => /private|no-store/.test(r.cacheControl ?? "")).length;
    const sharedCacheable = ok.filter((r) => /s-maxage/.test(r.cacheControl ?? "")).length;
    const probe = results.crawl.find((r) => r.path === NOT_FOUND_PROBE);
    lines.push(
      `**Crawl:** ${pages.length} URLs (top-level pages + one level deeper), each fetched twice.`,
      "",
      `* Status: ${byStatus.join(", ")}. 404 probe returned ${probe?.status}.`,
      `* CDN: ${hits} of ${ok.length} pages were \`x-vercel-cache: HIT\` on the second fetch; ${privateCount} sent \`private\`/\`no-store\`; ${sharedCacheable} sent \`s-maxage\` (Vercel strips it from the response, so read HIT there).`,
      `* Warm TTFB: p50 ${sec(percentile(ok.map((r) => r.warmTtfb), 50))}, p90 ${sec(percentile(ok.map((r) => r.warmTtfb), 90))}. First-fetch TTFB max ${sec(Math.max(...ok.map((r) => r.firstTtfb ?? 0)))}.`,
      `* Largest HTML (uncompressed): ${[...ok].sort((a, b) => b.htmlBytes - a.htmlBytes).slice(0, 3).map((r) => `\`${r.path}\` ${kb(r.htmlBytes)}`).join(", ")}.`,
    );
    const broken = pages.filter((r) => r.status >= 400 || r.status === -1);
    if (broken.length) lines.push(`* Broken: ${broken.map((r) => `\`${r.path}\` (${r.status})`).join(", ")}.`);
    lines.push("");
  }

  if (results.rsc) {
    lines.push("**RSC payload** (`RSC: 1`):", "", "| Page | Compressed | Raw |", "| --- | --- | --- |");
    for (const r of results.rsc) lines.push(`| \`${r.path}\` | ${r.status === 200 ? kb(r.wireBytes) : `HTTP ${r.status}`} | ${kb(r.rawBytes)} |`);
    lines.push("");
  }

  if (results.media) {
    const raw = results.media.pages.filter((p) => p.rawImages.length);
    const videos = Object.entries(results.media.videoBytes).sort((a, b) => b[1] - a[1]);
    lines.push(
      `**Media:** ${raw.length ? raw.map((p) => `\`${p.path}\` ${p.rawImages.length} un-parameterised Sanity image(s)`).join(", ") : "0 un-parameterised Sanity images"} on the measured pages.`,
      videos.length ? `MP4s referenced in page data: ${videos.length}, largest ${videos.slice(0, 3).map(([, b]) => mb(b)).join(", ")}, total ${mb(videos.reduce((t, [, b]) => t + b, 0))}.` : "No MP4s referenced.",
      "",
    );
  }

  if (results.lighthouse) {
    const by = (ff) => results.lighthouse.filter((r) => r.formFactor === ff && !r.error);
    const m = (ff, key) => median(by(ff).map((r) => r[key]));
    lines.push(
      `**Lighthouse 13**, ${opts.pages.length} pages, ${opts.runs === 1 ? "single runs (expect about ±5 points of noise)" : `median of ${opts.runs} runs per page`}.`,
      "",
      "| Median | Mobile | Desktop |",
      "| --- | --- | --- |",
      `| Performance score | ${score(m("mobile", "performance"))} | ${score(m("desktop", "performance"))} |`,
      `| LCP | ${sec(m("mobile", "lcpMs") / 1000)} | ${sec(m("desktop", "lcpMs") / 1000)} |`,
      `| FCP | ${sec(m("mobile", "fcpMs") / 1000)} | ${sec(m("desktop", "fcpMs") / 1000)} |`,
      `| Page weight | ${kb(m("mobile", "transferBytes"))} | ${kb(m("desktop", "transferBytes"))} |`,
      `| Accessibility | ${score(m("mobile", "accessibility"))} | ${score(m("desktop", "accessibility"))} |`,
      "",
      "Each cell: perf score / LCP / transfer weight.",
      "",
      "| Page | Mobile | Desktop |",
      "| --- | --- | --- |",
    );
    const cell = (r) => (!r ? "–" : r.error ? `error: ${r.error}` : `${score(r.performance)} / ${sec(r.lcpMs / 1000)} / ${mb(r.transferBytes)}`);
    for (const pathname of opts.pages) {
      const find = (ff) => results.lighthouse.find((r) => r.formFactor === ff && r.path === pathname);
      lines.push(`| \`${pathname}\` | ${cell(find("mobile"))} | ${cell(find("desktop"))} |`);
    }
    const mobile = by("mobile");
    lines.push(
      "",
      `**Targets:** mobile perf ≥ 85 on ${mobile.filter((r) => r.performance >= 85).length} of ${mobile.length}; mobile LCP ≤ 2.5 s on ${mobile.filter((r) => r.lcpMs <= 2500).length} of ${mobile.length}; transfer ≤ 2 MB on ${results.lighthouse.filter((r) => !r.error && r.transferBytes <= 2 * 1024 * 1024).length} of ${results.lighthouse.filter((r) => !r.error).length} page measurements (mobile + desktop).`,
    );
  }
  return lines.join("\n") + "\n";
}

// --- main ------------------------------------------------------------------

const opts = parseArgs(process.argv.slice(2));
mkdirSync(opts.out, { recursive: true });
console.log(`perf-baseline → ${opts.base}${BYPASS ? " (with Vercel bypass header)" : ""}\nOutput: ${opts.out}`);

const check = await request(opts.base + "/", { keepBody: false });
if (check.status !== 200) {
  fail(`GET ${opts.base}/ returned ${check.status}${check.status === 401 ? " — protected deploy: set VERCEL_AUTOMATION_BYPASS_SECRET" : ""}${check.headers["x-vercel-mitigated"] ? ` (firewall: ${check.headers["x-vercel-mitigated"]})` : ""}`);
}

const results = { base: opts.base, startedAt: new Date().toISOString(), pages: opts.pages };
if (!opts.skip.has("crawl")) {
  console.log("Crawl…");
  results.crawl = await crawl(opts);
}
if (!opts.skip.has("rsc")) {
  console.log("RSC payloads…");
  results.rsc = await rscPayloads(opts);
}
if (!opts.skip.has("media")) {
  console.log("Media audit…");
  results.media = await mediaAudit(opts);
}
if (!opts.skip.has("lighthouse")) {
  console.log("Warm-up…");
  await warmUp(opts);
  const runs = opts.pages.length * 2 * opts.runs;
  console.log(`Lighthouse (${runs} runs one at a time, about ${Math.max(1, Math.round((runs * 40) / 60))} min)…`);
  results.lighthouse = lighthouse(opts);
}
results.finishedAt = new Date().toISOString();

const summary = summarize(opts, results);
writeFileSync(path.join(opts.out, "results.json"), JSON.stringify(results, null, 2));
writeFileSync(path.join(opts.out, "summary.md"), summary);
console.log(`\n${summary}\nWrote ${path.join(opts.out, "summary.md")} and results.json`);
