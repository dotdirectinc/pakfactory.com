#!/usr/bin/env node
/**
 * Switch the active BACKEND environment (Supabase + API) in the root .env.local.
 *
 *   pnpm env:status     which environment is active, and what would shadow it
 *   pnpm env:staging    point the apps at the staging Supabase project + API
 *   pnpm env:prod       point them at production (prompts; --yes skips)
 *
 * NOT the same thing as `pnpm sanity:switch:*`. That one moves the Sanity
 * *dataset* (content) and writes to each app's own .env.local, because the
 * dataset vars live per app. This one moves the *backend* environment — the
 * Supabase project, the API base URL and the shared secrets — which live in the
 * ROOT .env.local and are shared by every app. Running one has no effect on the
 * other, and they can legitimately disagree: production content against a
 * staging database is a normal combination while building auth.
 *
 * Pattern (per switchable variable), matching pakfactory.com-backend:
 *   VAR_PROD=…       canonical prod
 *   VAR_STAGING=…    canonical staging
 *   VAR=…            active — a copy of one of the above
 *
 * A `# APP_ENV=prod|staging` marker at the top records which set is live.
 * (The backend repo uses `# DB_ENV=` for its own switch; the names are
 * deliberately different so a grep never conflates the two.)
 */
import {
  readFileSync, writeFileSync, copyFileSync, existsSync, readdirSync, unlinkSync,
} from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
const ENV_FILE = join(ROOT, ".env.local");
const TURBO_FILE = join(ROOT, "turbo.json");
const MARKER_PREFIX = "# APP_ENV=";
const MAX_BACKUPS = 5;

/**
 * The five variables that differ between environments.
 *
 * Sanity vars are NOT here on purpose — dataset switching is `sanity:switch:*`,
 * and folding them in would make one command silently change two unrelated
 * things.
 */
const SWITCHABLES = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "BACKEND_API_BASE_URL",
  "SERVICE_SHARED_SECRET",
  "WWW_ORIGIN_PROXY_SECRET",
];

const die = (m, code = 1) => { console.error(`✗ ${m}`); process.exit(code); };
const ok = (m) => console.log(`✓ ${m}`);
const info = (m) => console.log(`  ${m}`);
const warn = (m) => console.log(`⚠ ${m}`);
const hasFlag = (n) => process.argv.includes(`--${n}`);
const mask = (v) => (!v ? "(unset)" : v.length <= 12 ? "***" : `${v.slice(0, 8)}…${v.slice(-4)}`);

// ── .env as an ordered line list (comments and blanks preserved) ─────────────
const parseEnv = (text) => text.split("\n").map((raw) => {
  if (raw.trim() === "") return { type: "blank", raw };
  if (raw.startsWith("#")) return { type: "comment", raw };
  const eq = raw.indexOf("=");
  if (eq < 0) return { type: "other", raw };
  return { type: "kv", key: raw.slice(0, eq).trim(), value: raw.slice(eq + 1), raw };
});

// Always terminate the file. A .env without a trailing newline turns the next
// hand-appended `KEY=value` into a continuation of the last line, which parses
// as one mangled variable and is invisible until something reads the wrong value.
// (apps/www/.env.local is currently in exactly that state.)
const serialize = (lines) => {
  const text = lines.map((l) => l.raw).join("\n");
  return text.endsWith("\n") ? text : `${text}\n`;
};

function indexByKey(lines) {
  const m = new Map();
  lines.forEach((l, i) => { if (l.type === "kv") m.set(l.key, i); });
  return m;
}

function findMarker(lines) {
  const i = lines.findIndex((l) => l.type === "comment" && l.raw.trim().startsWith(MARKER_PREFIX));
  if (i < 0) return { index: -1, value: null };
  const v = lines[i].raw.trim().slice(MARKER_PREFIX.length).trim();
  return { index: i, value: v === "prod" || v === "staging" ? v : null };
}

function setMarker(lines, env) {
  const { index } = findMarker(lines);
  const raw = `${MARKER_PREFIX}${env}`;
  if (index >= 0) lines[index] = { type: "comment", raw };
  else lines.unshift({ type: "comment", raw }, { type: "blank", raw: "" });
}

function backup() {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  copyFileSync(ENV_FILE, `${ENV_FILE}.bak-${stamp}`);
  // Only prune backups THIS script wrote — a .bak from another tool is not ours.
  const OURS = /^\.env\.local\.bak-\d{4}-\d{2}-\d{2}T[\d-]+Z$/;
  for (const f of readdirSync(ROOT).filter((f) => OURS.test(f)).sort().reverse().slice(MAX_BACKUPS)) {
    unlinkSync(join(ROOT, f));
  }
}

function readLines() {
  if (!existsSync(ENV_FILE)) {
    die(`no .env.local at the repo root (${ROOT}).\n` +
        `  Worktrees do not inherit it — copy it in from another checkout.`);
  }
  return parseEnv(readFileSync(ENV_FILE, "utf8"));
}

async function confirm(prompt) {
  const rl = createInterface({ input: stdin, output: stdout });
  const a = await rl.question(`${prompt} (yes/no) `);
  rl.close();
  return a.trim().toLowerCase() === "yes";
}

/**
 * Root .env.local is NOT the last word. Next loads each app's own .env.local
 * first (Turbo runs it with cwd = apps/<app>), and @next/env never overwrites an
 * already-set key — so a duplicate in apps/www/.env.local silently wins and the
 * value this script just switched is ignored. Worth an explicit check: the
 * symptom is "I switched to staging and it still hits prod", which reads as a
 * bug in the switch rather than a shadowed key.
 */
function shadowedBy(keys) {
  const hits = [];
  const appsDir = join(ROOT, "apps");
  if (!existsSync(appsDir)) return hits;
  for (const app of readdirSync(appsDir)) {
    const f = join(appsDir, app, ".env.local");
    if (!existsSync(f)) continue;
    const idx = indexByKey(parseEnv(readFileSync(f, "utf8")));
    for (const k of keys) if (idx.has(k)) hits.push({ app, key: k });
  }
  return hits;
}

/**
 * Turbo 2.x defaults to strict env mode: a task only receives the variables
 * declared for it. An undeclared switchable is therefore invisible to
 * `turbo run dev|build` no matter what this script writes, and it is also
 * missing from the cache key — so a cached build can be replayed against the
 * wrong Supabase project.
 */
function undeclaredInTurbo(keys) {
  if (!existsSync(TURBO_FILE)) return [];
  const turbo = JSON.parse(readFileSync(TURBO_FILE, "utf8"));
  const declared = new Set(turbo.globalEnv ?? []);
  for (const task of Object.values(turbo.tasks ?? {})) {
    for (const e of task.env ?? []) declared.add(e);
  }
  return keys.filter((k) => !declared.has(k));
}

// ── status ──────────────────────────────────────────────────────────────────
function cmdStatus() {
  const lines = readLines();
  const idx = indexByKey(lines);
  const marker = findMarker(lines).value;
  const bar = "─".repeat(72);

  console.log(`\n${bar}\n  pakfactory.com — active backend environment\n${bar}\n`);

  if (!marker) {
    warn(`no ${MARKER_PREFIX} marker — environment is UNKNOWN.`);
    info("run `pnpm env:staging` or `pnpm env:prod` to establish it.");
  } else if (marker === "prod") {
    console.log(`  APP_ENV = \x1b[31mPROD\x1b[0m — the apps read the live Supabase project.`);
  } else {
    console.log(`  APP_ENV = \x1b[32mSTAGING\x1b[0m`);
  }

  console.log(`\n  Switchables (bare = what the apps read)\n`);
  let incomplete = 0;
  for (const key of SWITCHABLES) {
    const bare = idx.has(key) ? lines[idx.get(key)].value : null;
    const prod = idx.has(`${key}_PROD`) ? lines[idx.get(`${key}_PROD`)].value : null;
    const stg = idx.has(`${key}_STAGING`) ? lines[idx.get(`${key}_STAGING`)].value : null;
    if (!prod || !stg) incomplete++;
    const flags = `${prod ? "PROD✓" : "PROD✗"} ${stg ? "STAGING✓" : "STAGING✗"}`;
    console.log(`  ${key.padEnd(32)} ${flags.padEnd(18)} active=${mask(bare)}`);
    if (bare && prod && stg && bare !== prod && bare !== stg) {
      warn(`  ${key}: active value matches neither canonical line (hand-edited?)`);
    }
  }
  if (incomplete) {
    console.log("");
    warn(`${incomplete} switchable(s) missing a _PROD or _STAGING line — add them by hand.`);
  }

  const shadows = shadowedBy(SWITCHABLES);
  if (shadows.length) {
    console.log("");
    warn("SHADOWED — these keys also exist in an app .env.local, which wins over root:");
    for (const { app, key } of shadows) info(`  apps/${app}/.env.local → ${key}`);
    info("Next loads the app file first and never overwrites an already-set key.");
    info("Remove the app-level copy, or this switch has no effect for that app.");
  }

  const undeclared = undeclaredInTurbo(SWITCHABLES);
  if (undeclared.length) {
    console.log("");
    warn("NOT DECLARED in turbo.json — Turbo runs in strict env mode, so tasks");
    info("never receive these, and they are absent from the build cache key:");
    for (const k of undeclared) info(`  ${k}`);
  }

  console.log(`\n${bar}\n`);
}

// ── switch ──────────────────────────────────────────────────────────────────
async function cmdSwitch(env) {
  const lines = readLines();
  const idx = indexByKey(lines);
  const suffix = env.toUpperCase();

  // A partial switch is worse than either environment: the apps would read a
  // staging Supabase project while still signing requests with the prod secret.
  const missing = SWITCHABLES.filter((k) => !idx.has(`${k}_${suffix}`));
  if (missing.length) {
    die(`cannot switch to ${env} — missing canonical line(s):\n` +
        missing.map((k) => `    ${k}_${suffix}=`).join("\n") +
        `\n  A partial switch would mix both environments.`);
  }

  if (env === "prod" && !hasFlag("yes")) {
    console.log("");
    warn("switching the apps to the PRODUCTION Supabase project and API.");
    info("local sign-ins would create real customer accounts.");
    if (!(await confirm("Continue?"))) die("aborted.");
  }

  const changed = [];
  for (const key of SWITCHABLES) {
    const want = lines[idx.get(`${key}_${suffix}`)].value;
    if (idx.has(key)) {
      if (lines[idx.get(key)].value === want) continue;
      lines[idx.get(key)] = { type: "kv", key, value: want, raw: `${key}=${want}` };
    } else {
      // No bare line yet — insert directly after the canonical one so related
      // keys stay together rather than accumulating at the end of the file.
      const at = idx.get(`${key}_${suffix}`);
      lines.splice(at + 1, 0, { type: "kv", key, value: want, raw: `${key}=${want}` });
      idx.clear();
      indexByKey(lines).forEach((v, k) => idx.set(k, v));
    }
    changed.push(key);
  }

  setMarker(lines, env);
  backup();
  writeFileSync(ENV_FILE, serialize(lines), "utf8");

  ok(`active backend environment → ${env.toUpperCase()}` +
     (changed.length ? ` (${changed.length} var(s) written)` : " (already current)"));

  const shadows = shadowedBy(changed);
  if (shadows.length) {
    console.log("");
    warn("this switch will NOT take effect for:");
    for (const { app, key } of shadows) info(`  apps/${app}/.env.local defines ${key} — app file wins over root`);
  }

  const undeclared = undeclaredInTurbo(SWITCHABLES);
  if (undeclared.length) {
    console.log("");
    warn(`${undeclared.length} switchable(s) are not declared in turbo.json — strict env`);
    info("mode means turbo tasks will not receive them. Declare them before relying on this.");
  }

  console.log("");
  warn("NEXT_PUBLIC_* values are inlined into the client bundle at BUILD time.");
  info("restart the dev server — a running `next dev` keeps serving the old values.");
  info("This file is local only; Vercel deployments read their own env settings.");
}

const action = process.argv[2];
switch (action) {
  case "status": cmdStatus(); break;
  case "staging": await cmdSwitch("staging"); break;
  case "prod": await cmdSwitch("prod"); break;
  default: die("Usage: switch-env.mjs <status|staging|prod> [--yes]");
}
