#!/usr/bin/env node
/**
 * Deploy a Studio with the RIGHT dataset AND the right Presentation targets.
 *
 *   pnpm sanity:deploy:staging    → pakfactory-staging.sanity.studio  (development)
 *   pnpm sanity:deploy:prod       → pakfactory.sanity.studio          (production) ⚠️
 *
 * ── Why this script exists instead of an inline env prefix ──────────────────
 *
 * `sanity build` runs Vite in PRODUCTION mode, and Vite's env precedence is
 *
 *     shell env  >  .env.production  >  .env.local  >  .env
 *
 * so `apps/studio/.env.production` outranks a developer's `.env.local`. That file
 * is written for the PRODUCTION Studio — `SANITY_STUDIO_PREVIEW_URL_BLOG` is
 * `https://pakfactory.com/blog/`. The old deploy scripts exported only
 * `SANITY_STUDIO_DATASET`, so the staging Studio was built with the development
 * dataset and the PRODUCTION blog as its preview target: the Presentation pane
 * showed pakfactory.com/blog, reading production content, while the editor edited
 * development content. `pnpm studio:staging` could not help — it writes
 * `.env.local`, which loses to `.env.production` at build time.
 *
 * Shell env wins over every `.env` file, so exporting the whole target here is
 * what makes the deployed Studio match its dataset. The values come from
 * studio-targets.mjs, shared with `studio-target.mjs`, so a deployed Studio and a
 * local one cannot disagree about which site a workspace previews.
 *
 * Whatever a deploy bakes in, the origin must also be listed in the workspace's
 * `allowOrigins` in `apps/studio/sanity.config.ts` — Presentation refuses to frame
 * anything else.
 */
import { spawnSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { TARGETS, PREVIEW_VARS } from "./studio-targets.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");

const die = (m) => {
  console.error(`✗ ${m}`);
  process.exit(1);
};

const key = process.argv[2];
// Only the two DEPLOYED targets. `local` is a pairing for `.env.local`, not a
// hostname — deploying it would push localhost preview URLs to a live Studio.
const DEPLOYABLE = ["staging", "prod"];
if (!DEPLOYABLE.includes(key)) {
  die(`Usage: studio-deploy.mjs <${DEPLOYABLE.join("|")}> [-- <extra sanity deploy args>]`);
}
const target = TARGETS[key];

// Extra args are passed through after `--` so `--yes` and friends still work.
const sepIndex = process.argv.indexOf("--");
const passthrough = sepIndex === -1 ? [] : process.argv.slice(sepIndex + 1);
// An unrecognised bare argument is a hard exit, never ignored — a typo that gets
// skipped is how a deploy aims at the wrong Studio and still reports success.
const strays = process.argv.slice(3, sepIndex === -1 ? undefined : sepIndex);
if (strays.length) die(`Unrecognised argument: ${strays[0]} (pass sanity flags after \`--\`)`);

// The whole target, exported. Vite inlines these at build time; shell env beats
// every .env file, so these are what the deployed bundle ships with.
const env = {
  ...process.env,
  SANITY_STUDIO_DATASET: target.dataset,
  // A preview target of `null` means "not wired for this Studio yet" — an
  // unreleased surface. It is OMITTED rather than exported empty, because the
  // Studio config decides whether to offer the Presentation tool by whether the
  // variable is set at all.
  ...Object.fromEntries(
    Object.entries(PREVIEW_VARS)
      .filter(([k]) => target.previews[k])
      .map(([k, name]) => [name, target.previews[k]]),
  ),
};

console.log(`\n🚀  Deploying the ${target.label} — ${target.studioUrl}\n`);
console.log(`    dataset        ${target.dataset}`);
for (const [k] of Object.entries(PREVIEW_VARS)) {
  const url = target.previews[k];
  console.log(
    `    previews ${k.padEnd(4)}  ${url ?? "— not wired: no Presentation tab for this surface —"}`,
  );
}
console.log("");

const result = spawnSync(
  "pnpm",
  [
    "--filter",
    "@pakfactory/studio",
    "exec",
    "sanity",
    "deploy",
    "--url",
    target.deployHost,
    ...passthrough,
  ],
  { cwd: ROOT, env, stdio: "inherit" },
);

if (result.error) die(result.error.message);
process.exit(result.status ?? 1);
