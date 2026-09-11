#!/usr/bin/env node
/**
 * Export a Sanity dataset to a local .tar.gz backup.
 * Usage: node scripts/sanity/backup.mjs [production|development]
 * Output file path is printed as BACKUP_FILE=<path> for shell capture.
 *
 * ⚠️ NEEDS NODE >= 22.12. It shells out to `npx sanity@latest`, which no longer
 * runs on the repo's pinned Node 20 — so `nvm use 22` first. Note that pnpm is
 * installed per Node version, so it may not exist under 22: call this with
 * plain `node`, not `pnpm sanity:backup:prod`, if that is the case.
 *
 * Env is loaded here the same way every migration script loads it. It used to
 * read the token straight off `process.env` with no dotenv call, which meant it
 * silently ran unauthenticated for anyone who had not exported the token by
 * hand — the one Sanity script in the repo that did not load `.env.local`.
 */
import { execSync } from "node:child_process";
import { mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import { config as loadEnv } from "dotenv";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
loadEnv({ path: join(ROOT, ".env.local") });
loadEnv({ path: join(ROOT, ".env") });

const BACKUP_DIR = join(ROOT, "backups");
const PROJECT_ID = "8293wrxp";

const dataset = process.argv[2] ?? "production";
if (!["production", "development"].includes(dataset)) {
  console.error(`❌  Invalid dataset "${dataset}". Use: production | development`);
  process.exit(1);
}

if (!existsSync(BACKUP_DIR)) mkdirSync(BACKUP_DIR, { recursive: true });

const now = new Date();
const pad = (n) => String(n).padStart(2, "0");
const stamp = [
  now.getFullYear(),
  pad(now.getMonth() + 1),
  pad(now.getDate()),
  "-",
  pad(now.getHours()),
  pad(now.getMinutes()),
  pad(now.getSeconds()),
].join("");
const outFile = join(BACKUP_DIR, `sanity-${dataset}-${stamp}.tar.gz`);

const token =
  process.env.SANITY_BACKUP_TOKEN ||
  process.env.SANITY_AUTH_TOKEN ||
  process.env.SANITY_API_WRITE_TOKEN ||
  process.env.SANITY_API_READ_TOKEN ||
  "";

// Fail loudly rather than shipping an unauthenticated export. Without a token
// the CLI falls back to whatever `sanity login` session happens to exist, which
// on a fresh machine is none — and the failure then looks like a CLI bug.
if (!token) {
  console.error(
    "❌  No token. Set SANITY_BACKUP_TOKEN in .env.local (SANITY_AUTH_TOKEN,\n" +
      "    SANITY_API_WRITE_TOKEN and SANITY_API_READ_TOKEN are also accepted)."
  );
  process.exit(1);
}

console.log(`\n📦  Backing up Sanity "${dataset}" dataset`);
console.log(`    Project : ${PROJECT_ID}`);
console.log(`    Output  : ${outFile}\n`);

try {
  // The token goes through the environment, not `--token`. That flag was removed
  // from the Sanity CLI — passing it now aborts the export with "Nonexistent
  // flag". Env is the better channel anyway: an argv secret is visible to `ps`
  // and lands in shell history.
  execSync(
    `npx sanity@latest dataset export ${dataset} "${outFile}" -p ${PROJECT_ID}`,
    { stdio: "inherit", cwd: ROOT, env: { ...process.env, SANITY_AUTH_TOKEN: token } }
  );
  console.log(`\n✅  Backup saved: ${outFile}`);
  // Machine-readable output for shell capture: BACKUP_FILE=...
  process.stdout.write(`\nBACKUP_FILE=${outFile}\n`);
} catch {
  console.error("\n❌  Export failed.");
  process.exit(1);
}
