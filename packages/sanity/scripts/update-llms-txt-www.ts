/**
 * CLI to curate and publish the SITE-WIDE /llms.txt (www app — case studies)
 * to Sanity. Sibling of `update-llms-txt.ts` (blog).
 *
 * Writes the `settings` singleton's `llmsTxtWww` field, which
 * `apps/www/src/app/llms.txt/route.ts` serves — exposed publicly at
 * `pakfactory.com/llms.txt` via the nginx root proxy.
 *
 * Interactive (default): lists the 30 most-recent case studies; pick 10–20.
 * Auto (`--auto`): all case studies when ≤ 20 exist, otherwise the 20 most
 * recently modified (`_updatedAt desc`).
 *
 * Usage (from repo root):
 *   pnpm update:llms-txt:www                    # interactive, dataset from env
 *   pnpm update:llms-txt:www prod --auto        # auto-select, production
 *   pnpm update:llms-txt:www prod --auto --yes  # fully non-interactive (CI)
 *
 * Flags:
 *   prod|production|dev|development or --dataset=<name>
 *   --auto   — automatic selection (rules above)
 *   --yes    — skip the final write confirmation
 *
 * Env (repo root .env.local):
 *   NEXT_PUBLIC_SANITY_PROJECT_ID or SANITY_STUDIO_PROJECT_ID
 *   SANITY_API_WRITE_TOKEN — Editor token
 *   NEXT_PUBLIC_SITE_URL   — origin only (e.g. https://pakfactory.com)
 */

import { createClient } from "@sanity/client";
import { config as loadEnv } from "dotenv";
import { createInterface } from "node:readline/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
loadEnv({ path: join(__dirname, "../../../.env.local") });
loadEnv({ path: join(__dirname, "../../../.env") });

// ── CLI args ──────────────────────────────────────────────────────────────────

const argv = process.argv.slice(2);
const AUTO = argv.includes("--auto");
const YES = argv.includes("--yes");

const DATASET_ALIASES: Record<string, string> = {
  prod: "production",
  production: "production",
  dev: "development",
  development: "development",
};

function resolveDatasetArg(): string | undefined {
  for (const a of argv) {
    const m = a.match(/^--dataset=(.+)$/);
    const candidate = m ? m[1] : a;
    if (candidate in DATASET_ALIASES) return DATASET_ALIASES[candidate];
    if (m) {
      console.error(`❌  Unknown dataset "${m[1]}" — use prod|production|dev|development.`);
      process.exit(1);
    }
  }
  return undefined;
}

// ── Sanity client ─────────────────────────────────────────────────────────────

const projectId =
  process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ||
  process.env.SANITY_STUDIO_PROJECT_ID ||
  "";
const dataset =
  resolveDatasetArg() ||
  process.env.NEXT_PUBLIC_SANITY_DATASET ||
  process.env.SANITY_STUDIO_DATASET ||
  "production";
const apiVersion = process.env.NEXT_PUBLIC_SANITY_API_VERSION || "2025-01-01";
const token = process.env.SANITY_API_WRITE_TOKEN || "";

if (!projectId) {
  console.error("❌  NEXT_PUBLIC_SANITY_PROJECT_ID / SANITY_STUDIO_PROJECT_ID not set");
  process.exit(1);
}
if (!token) {
  console.error("❌  SANITY_API_WRITE_TOKEN not set in .env.local");
  process.exit(1);
}

const client = createClient({ projectId, dataset, apiVersion, token, useCdn: false });

// ── URL helpers ───────────────────────────────────────────────────────────────

const rawSiteUrl = process.env.NEXT_PUBLIC_SITE_URL || "";
const siteUrl = rawSiteUrl.includes("localhost")
  ? "https://pakfactory.com"
  : rawSiteUrl.replace(/\/$/, "") || "https://pakfactory.com";

function caseStudyUrl(slug: string): string {
  return `${siteUrl}/case-studies/${slug}`;
}

// ── Data ──────────────────────────────────────────────────────────────────────

interface CaseStudy {
  _id: string;
  title: string;
  slug: string;
  publishedAt?: string;
}

const CASE_STUDY_FILTER = `_type == "caseStudy" && defined(slug.current)`;

/** Auto rule: all case studies when ≤ 20, else the 20 most recently modified. */
const AUTO_STUDY_CAP = 20;

async function fetchData(auto: boolean): Promise<{ studies: CaseStudy[]; total: number }> {
  const studiesQuery = auto
    ? `*[${CASE_STUDY_FILTER}] | order(_updatedAt desc)[0...${AUTO_STUDY_CAP}]{_id, title, "slug": slug.current, publishedAt}`
    : `*[${CASE_STUDY_FILTER}] | order(coalesce(publishedAt, _createdAt) desc)[0...30]{_id, title, "slug": slug.current, publishedAt}`;

  const [studies, total] = await Promise.all([
    client.fetch<CaseStudy[]>(studiesQuery),
    client.fetch<number>(`count(*[${CASE_STUDY_FILTER}])`),
  ]);
  return { studies, total };
}

// ── Prompt helpers (mirrors the blog script) ──────────────────────────────────

function parseNumbers(input: string): number[] {
  return input
    .split(/[\s,]+/)
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => !isNaN(n));
}

async function promptNumbers(
  rl: Awaited<ReturnType<typeof createInterface>>,
  question: string,
  min: number,
  max: number,
  count: { min: number; max: number }
): Promise<number[]> {
  while (true) {
    const raw = await rl.question(question);
    const nums = parseNumbers(raw);
    const valid = nums.filter((n) => n >= min && n <= max);
    const unique = [...new Set(valid)];
    if (unique.length < count.min || unique.length > count.max) {
      console.log(
        `  ⚠️  Select between ${count.min} and ${count.max} items (got ${unique.length}). Try again.\n`
      );
      continue;
    }
    return unique;
  }
}

// ── llms.txt builder ──────────────────────────────────────────────────────────

function buildLlmsTxt(studies: CaseStudy[]): string {
  const blogUrl = `${siteUrl}/blog`;
  const lines: string[] = [
    "# PakFactory",
    "",
    "> PakFactory designs and manufactures custom packaging for brands of all sizes — boxes, bags, mailers, and specialty packaging manufactured to spec.",
    "",
    siteUrl,
    "",
    "## Case Studies",
    "",
    "Real-world examples of how PakFactory has helped brands solve packaging challenges.",
    "",
    `- [All Case Studies](${siteUrl}/case-studies)`,
    ...studies.map((s) => `- [${s.title}](${caseStudyUrl(s.slug)})`),
    "",
    "## Blog",
    "",
    "Packaging insights, industry trends, and design inspiration.",
    "",
    `- [Blog](${blogUrl})`,
    "",
    "> This index is curated and refreshed quarterly.",
  ];
  return lines.join("\n");
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n🗂  Fetching case studies… (dataset: ${dataset}${AUTO ? ", auto mode" : ""})\n`);
  const { studies, total } = await fetchData(AUTO);

  if (!studies.length) {
    console.error("❌  No published case studies found.");
    process.exit(1);
  }

  const rl = createInterface({ input: process.stdin, output: process.stdout });

  try {
    let chosen: CaseStudy[];

    if (AUTO) {
      chosen = studies; // query already capped at the AUTO_STUDY_CAP most recently modified
      console.log("🤖 Auto selection:");
      console.log(
        `   Case studies: ${chosen.length}` +
          (total > AUTO_STUDY_CAP
            ? ` (${AUTO_STUDY_CAP} most recently modified of ${total})`
            : " (all)")
      );
    } else {
      console.log("── Case studies (30 most recent) ──────────────────────────────");
      studies.forEach((s, i) => {
        const date = s.publishedAt ? new Date(s.publishedAt).toISOString().slice(0, 10) : "—";
        console.log(`  ${String(i + 1).padStart(2)}.  [${date}]  ${s.title}`);
      });
      console.log("\n────────────────────────────────────────────────────────────────\n");

      if (studies.length < 10) {
        console.log(`  ℹ️  Only ${studies.length} case stud(ies) available — all included automatically.`);
        chosen = studies;
      } else {
        const nums = await promptNumbers(
          rl,
          `Select 10–20 case studies (space or comma separated):\n> `,
          1,
          studies.length,
          { min: 10, max: 20 }
        );
        chosen = nums.map((n) => studies[n - 1]);
      }
    }

    // ── Preview ───────────────────────────────────────────────────────────────
    const content = buildLlmsTxt(chosen);
    console.log("\n── Preview ─────────────────────────────────────────────────────\n");
    console.log(content);
    console.log("\n────────────────────────────────────────────────────────────────");

    if (YES) {
      console.log(`\n--yes supplied — writing to Sanity (dataset: ${dataset}) without prompt.`);
    } else {
      const confirm = await rl.question(`\nWrite this to Sanity (dataset: ${dataset})? [y/N] `);
      if (confirm.trim().toLowerCase() !== "y") {
        console.log("Aborted. Nothing written.");
        process.exit(0);
      }
    }

    // ── Patch Sanity ──────────────────────────────────────────────────────────
    // Published singleton id so the www published-only client can read it.
    await client.createIfNotExists({ _id: "settings", _type: "settings" });
    await client.patch("settings").set({ llmsTxtWww: content }).commit();

    console.log(`\n✅  llmsTxtWww updated on ${dataset}. www revalidates within 5 min.\n`);
  } finally {
    rl.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
