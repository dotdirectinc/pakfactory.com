#!/usr/bin/env node
/**
 * Which remote Studio do the apps point at, and which dataset do they read?
 *
 *   pnpm studio:status     show it for blog / www / studio, and say if it is coherent
 *   pnpm studio:local      point them at the local Studio  (localhost:3333 · development)
 *   pnpm studio:staging    point them at the staging Studio (development dataset)
 *   pnpm studio:prod       point them at the production Studio (production dataset) ⚠️
 *
 * ── Why these two variables move together ───────────────────────────────────
 *
 * `NEXT_PUBLIC_SANITY_STUDIO_URL` is not decoration. It is `stega.studioUrl` in
 * each app's `lib/sanity/client.ts`, which is what makes a click on a
 * Presentation overlay open the right field in the right Studio. It is only
 * active for the `drafts` perspective — i.e. exactly when someone is editing.
 *
 * A deployed Studio can only read ONE dataset; it is baked in at build time. So
 * the Studio URL implies a dataset, and if the app is reading a different one the
 * overlay click opens a Studio that does not contain the document. You get "not
 * found" for a document you are looking at. That is the failure this script
 * exists to make visible — `status` names the mismatch instead of leaving it to
 * be discovered by clicking.
 *
 * ── What this does NOT touch ────────────────────────────────────────────────
 *
 * Only local `.env.local` files. The deployed apps read their values from Vercel
 * project settings, per environment, and nothing here reaches them — see
 * RUNBOOK.md § Deployed studios. Both halves are printed by `status` so the
 * difference is on screen rather than assumed.
 *
 * Sibling scripts, deliberately separate (see switch-env.mjs's header for the
 * same reasoning): `sanity:switch:*` moves the dataset alone; `env:*` moves the
 * backend environment. This one moves the Studio pairing.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");

/**
 * The three coherent pairings. A dataset is a property OF the Studio here, not a
 * separate choice — that is the whole point of pairing them in one command.
 */
const TARGETS = {
  local: {
    studioUrl: "http://localhost:3333",
    dataset: "development",
    label: "local Studio (pnpm dev:studio)",
    // What the Studio's Presentation pane points AT. Local blog runs on :3003
    // with no basePath; local www on :3000, where the case-studies enable route
    // lives under /case-studies (PROD-2223) and the site root is the whole app.
    previews: {
      BLOG: "http://localhost:3003/",
      WWW: "http://localhost:3000/case-studies/",
      SITE: "http://localhost:3000/",
    },
  },
  staging: {
    studioUrl: "https://pakfactory-staging.sanity.studio",
    dataset: "development",
    label: "staging Studio",
    previews: {
      // staging-blog is mounted under /blog (NEXT_PUBLIC_BLOG_BASE_PATH), so the
      // base carries it — the bare host 404s.
      BLOG: "https://staging-blog.pakfactory.com/blog/",
      WWW: "https://staging.pakfactory.com/case-studies/",
      SITE: "https://staging.pakfactory.com/",
    },
  },
  prod: {
    studioUrl: "https://pakfactory.sanity.studio",
    dataset: "production",
    label: "production Studio",
    previews: {
      BLOG: "https://pakfactory.com/blog/",
      WWW: "https://pakfactory.com/case-studies/",
      // Deliberately staging, and NOT a mistake: production has no site root to
      // preview. The apex root is Magento — pakfactory.com/products redirects
      // home and /capabilities 404s — so the product / solution / customization
      // routes exist only on staging. Decided 2026-09-16; matches what the
      // deployed prod Studio already ships in apps/studio/.env.production.
      SITE: "https://staging.pakfactory.com/",
    },
    // Flags the SITE row above as a known exception rather than a mismatch, so
    // `status` explains it instead of crying wolf on every prod check.
    siteCrossDataset:
      "production Studio previews the staging site root — production has no site root of its own",
  },
};

/**
 * Which dataset each preview host actually serves. Measured 2026-09-16 by reading
 * the asset URLs out of the served HTML (`cdn.sanity.io/…/8293wrxp/<dataset>/…`),
 * not read off a settings page — the Vercel values are stored Sensitive and
 * cannot be read back. Re-measure if a deployment's env changes.
 */
const HOST_DATASET = {
  "localhost:3003": "development",
  "localhost:3000": "development",
  "staging-blog.pakfactory.com": "development",
  "staging.pakfactory.com": "development",
  "pakfactory.com": "production",
};

/**
 * Per app: which file, and which variable names live in it. The Studio app is
 * different in kind — it does not *point at* a Studio, it IS one — so it carries
 * only the dataset, under the SANITY_STUDIO_ prefix Vite requires.
 */
const APPS = [
  {
    name: "blog",
    file: "apps/blog/.env.local",
    studioUrlVar: "NEXT_PUBLIC_SANITY_STUDIO_URL",
    datasetVar: "NEXT_PUBLIC_SANITY_DATASET",
  },
  {
    name: "www",
    file: "apps/www/.env.local",
    studioUrlVar: "NEXT_PUBLIC_SANITY_STUDIO_URL",
    datasetVar: "NEXT_PUBLIC_SANITY_DATASET",
  },
  {
    name: "studio",
    file: "apps/studio/.env.local",
    studioUrlVar: null,
    datasetVar: "SANITY_STUDIO_DATASET",
    // The Studio does not point at a Studio — it points at the SITES it previews.
    previewVars: {
      BLOG: "SANITY_STUDIO_PREVIEW_URL_BLOG",
      WWW: "SANITY_STUDIO_PREVIEW_URL_WWW",
      SITE: "SANITY_STUDIO_PREVIEW_URL_SITE",
    },
  },
];

const die = (m) => {
  console.error(`✗ ${m}`);
  process.exit(1);
};
const hasFlag = (n) => process.argv.includes(`--${n}`);

/**
 * Match one `VAR=value` line: quoted or bare, with whatever follows the value on
 * that line captured separately.
 *
 * The trailing group is not pedantry. `.env.local` files in this repo contain
 * lines like `SANITY_STUDIO_PREVIEW_URL_WWW="https://…/"# a comment` — a comment
 * jammed onto the value with no space. dotenv parses that fine (it stops at the
 * closing quote), so the variable IS set. An anchored `…$` pattern does not match
 * it, which made `status` report the variable as unset and, far worse, made a
 * switch report success while leaving the old value in place.
 */
const varLine = (name) =>
  new RegExp(`^(${name}=)(?:"([^"\\n]*)"|([^"\\n#]*))([^\\n]*)$`, "m");

/** Read `VAR=value` (quoted or not, trailing comment tolerated). */
function readVar(content, name) {
  const m = content.match(varLine(name));
  if (!m) return null;
  const value = m[2] !== undefined ? m[2] : (m[3] ?? "").trim();
  return value === "" ? null : value;
}

/** Replace `VAR=…` in place, keeping any trailing comment. Null when absent. */
function writeVar(content, name, value) {
  const re = varLine(name);
  if (!re.test(content)) return null;
  return content.replace(re, (_m, key, _q, _bare, trailing) => `${key}"${value}"${trailing}`);
}

/**
 * Set `VAR=value`, appending the line when the key is absent. Unlike writeVar,
 * this cannot fail: SANITY_STUDIO_PREVIEW_URL_SITE is new (PROD-2494) and is
 * missing from every .env.local written before it existed.
 */
function upsertVar(content, name, value) {
  const replaced = writeVar(content, name, value);
  if (replaced !== null) return replaced;
  const sep = content.endsWith("\n") ? "" : "\n";
  return `${content}${sep}${name}="${value}"\n`;
}

/** Host (with port) of a preview base, for the HOST_DATASET lookup. */
function hostOf(url) {
  try {
    const u = new URL(url);
    return u.port ? `${u.hostname}:${u.port}` : u.hostname;
  } catch {
    return null;
  }
}

/** Which target does this pair correspond to, if any? */
function matchTarget(studioUrl, dataset) {
  return (
    Object.entries(TARGETS).find(
      ([, t]) =>
        (studioUrl === null || t.studioUrl === studioUrl) &&
        t.dataset === dataset,
    )?.[0] ?? null
  );
}

function cmdStatus() {
  console.log("\n  Local .env.local — which Studio each app points at\n");
  let incoherent = 0;

  for (const app of APPS) {
    const path = join(ROOT, app.file);
    if (!existsSync(path)) {
      console.log(`  ${app.name.padEnd(8)} (no ${app.file})`);
      continue;
    }
    const content = readFileSync(path, "utf8");
    const studioUrl = app.studioUrlVar ? readVar(content, app.studioUrlVar) : null;
    const dataset = readVar(content, app.datasetVar);
    const target = matchTarget(studioUrl, dataset);

    const shown = app.studioUrlVar ? (studioUrl ?? "(unset)") : "— is the Studio —";
    console.log(`  ${app.name.padEnd(8)} ${shown.padEnd(46)} dataset: ${dataset ?? "(unset)"}`);

    // The Studio → site direction. A Studio on one dataset previewing a site that
    // renders another is the mismatch this section exists to name: the pane
    // renders content the editor is not editing, and overlays cannot line up.
    for (const [key, name] of Object.entries(app.previewVars ?? {})) {
      const url = readVar(content, name);
      if (!url) {
        console.log(`           previews ${key.padEnd(4)} (unset — falls back to localhost)`);
        continue;
      }
      const host = hostOf(url);
      const hostDataset = host ? HOST_DATASET[host] : undefined;
      // Identify the target by the Studio's DATASET, not by the URL alone:
      // `prod` and `staging` deliberately share the same SITE url, so a
      // url-only lookup finds `staging` first and misses prod's declared
      // exception — which is how this read as a mismatch on every prod check.
      const known = Object.values(TARGETS).find(
        (t) => t.dataset === dataset && t.previews[key] === url,
      );
      const exception = key === "SITE" && known?.siteCrossDataset;
      let note = "";
      if (!hostDataset) note = "  ⚠️ unrecognised host";
      else if (dataset && hostDataset !== dataset) {
        note = exception
          ? `  ℹ️  by design — ${known.siteCrossDataset}`
          : `  ⚠️ that site renders "${hostDataset}", this Studio reads "${dataset}"`;
        if (!exception) incoherent++;
      }
      console.log(`           previews ${key.padEnd(4)} ${url.padEnd(45)}${note}`);
    }

    // The mismatch this script exists to catch: a Studio URL whose baked-in
    // dataset is not the one the app reads.
    if (app.studioUrlVar && studioUrl && dataset && !target) {
      const implied = Object.values(TARGETS).find((t) => t.studioUrl === studioUrl);
      console.log(
        implied
          ? `           ⚠️  MISMATCH — that Studio reads "${implied.dataset}", this app reads "${dataset}".\n` +
              `               Overlay clicks will open a Studio without the document in it.`
          : `           ⚠️  Unrecognised Studio URL — not one of: ${Object.keys(TARGETS).join(", ")}.`,
      );
      incoherent++;
    }
  }

  const datasets = new Set(
    APPS.map((app) => {
      const p = join(ROOT, app.file);
      return existsSync(p) ? readVar(readFileSync(p, "utf8"), app.datasetVar) : null;
    }).filter(Boolean),
  );
  if (datasets.size > 1) {
    console.log(
      `\n  ⚠️  The apps disagree on the dataset (${[...datasets].join(" vs ")}).` +
        `\n      \`pnpm sanity:switch:dev\` / \`:prod\` aligns them.`,
    );
    incoherent++;
  }

  console.log(`\n  Deployed apps do NOT read these files. Their values live in Vercel:`);
  console.log(`    vercel env ls  (per project, per environment — Production / Preview)`);
  console.log(`    NEXT_PUBLIC_SANITY_STUDIO_URL is stored Sensitive, so it can be`);
  console.log(`    replaced but never read back. See RUNBOOK.md § Deployed studios.\n`);

  if (incoherent === 0) console.log("  ✅ Coherent.\n");
  process.exit(incoherent === 0 ? 0 : 1);
}

function cmdSwitch(key) {
  const target = TARGETS[key];

  if (key === "prod" && !hasFlag("yes")) {
    console.log(`
⚠️   Pointing your local apps at the PRODUCTION Studio and dataset.
    Drafts you create while previewing will be production drafts, and
    overlay clicks open the live Studio.

    Re-run with --yes to confirm:  pnpm studio:prod --yes
`);
    process.exit(1);
  }

  let changed = 0;
  for (const app of APPS) {
    const path = join(ROOT, app.file);
    if (!existsSync(path)) {
      console.log(`⚠️   Skipped (not found): ${app.file}`);
      continue;
    }
    let content = readFileSync(path, "utf8");
    let touched = false;

    for (const [name, value] of [
      [app.studioUrlVar, target.studioUrl],
      [app.datasetVar, target.dataset],
    ]) {
      if (!name) continue;
      const next = writeVar(content, name, value);
      if (next === null) {
        console.log(`ℹ️   ${app.file}: no ${name} line to update — add one if the app needs it.`);
        continue;
      }
      content = next;
      touched = true;
    }

    // Which SITES this Studio previews — the third axis. Upserted, not replaced,
    // because SITE is newer than most .env.local files.
    for (const [key, name] of Object.entries(app.previewVars ?? {})) {
      content = upsertVar(content, name, target.previews[key]);
      touched = true;
    }

    if (touched) {
      writeFileSync(path, content, "utf8");
      console.log(`✅  ${app.file}`);
      changed++;
    }
  }

  console.log(`\n🎯  Pointing at the ${target.label} — dataset "${target.dataset}" (${changed} file${changed !== 1 ? "s" : ""} updated)`);
  console.log(`    ${target.studioUrl}`);
  console.log("    Restart your dev servers for the change to take effect.\n");
}

const cmd = process.argv[2];
const rest = process.argv.slice(3).filter((a) => a !== "--yes");
// An unrecognised argument is a hard exit, never ignored — a typo that gets
// skipped is how a command aims at the wrong target and still reports success.
if (rest.length) die(`Unrecognised argument: ${rest[0]}`);

switch (cmd) {
  case undefined:
  case "status":
    cmdStatus();
    break;
  case "local":
  case "staging":
  case "prod":
    cmdSwitch(cmd);
    break;
  default:
    die("Usage: studio-target.mjs <status|local|staging|prod> [--yes]");
}
