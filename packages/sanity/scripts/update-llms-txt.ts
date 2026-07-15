/**
 * CLI to curate and publish /llms.txt content to Sanity.
 *
 * Interactive (default): lists all categories and the 30 most-recent posts;
 * prompts you to pick 5 categories and 10–20 posts by number; then patches the
 * `settings` singleton's `llmsTxt` field.
 *
 * Auto (`--auto`): no prompts — selects
 *   • Categories: all when ≤ 10 exist, otherwise the 10 most recently modified
 *   • Posts:      all when ≤ 20 exist, otherwise the 20 most recently modified
 *   ("modified" = Sanity `_updatedAt`, newest first.)
 *
 * Usage (from repo root):
 *   pnpm update:llms-txt                       # interactive, dataset from env
 *   pnpm update:llms-txt prod                  # interactive, production dataset
 *   pnpm update:llms-txt dev --auto            # auto-select, development dataset
 *   pnpm update:llms-txt --dataset=production --auto --yes   # fully non-interactive (CI)
 *
 * Flags:
 *   prod|production|dev|development  or  --dataset=<name> — target dataset
 *                                        (default: env NEXT_PUBLIC_SANITY_DATASET → production)
 *   --auto                            — automatic selection (rules above)
 *   --yes                             — skip the final write confirmation
 *
 * Env (repo root .env.local):
 *   NEXT_PUBLIC_SANITY_PROJECT_ID or SANITY_STUDIO_PROJECT_ID
 *   NEXT_PUBLIC_SANITY_DATASET   or SANITY_STUDIO_DATASET
 *   SANITY_API_WRITE_TOKEN       — Editor token with write access
 *   NEXT_PUBLIC_SITE_URL         — Origin (e.g. https://www.pakfactory.com)
 *   NEXT_PUBLIC_BLOG_BASE_PATH   — Path prefix (e.g. /blog), empty for root
 *
 * TODO (future automation): once analytics page-view data is available (GTM /
 * GA4), upgrade `--auto` to rank by page-views over the trailing 90 days
 * instead of recency, and run quarterly via GitHub Action / cron with
 * `--auto --yes`. Until then, run quarterly.
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
      console.error(
        `❌  Unknown dataset "${m[1]}" — use prod|production|dev|development.`
      );
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
const apiVersion =
  process.env.NEXT_PUBLIC_SANITY_API_VERSION || "2025-01-01";
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
  ? "https://www.pakfactory.com"
  : rawSiteUrl || "https://www.pakfactory.com";

const rawBase = process.env.NEXT_PUBLIC_BLOG_BASE_PATH || "";
const basePath = rawBase === "/" ? "" : rawBase.replace(/\/$/, "");

function blogUrl(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${siteUrl}${basePath}${p}`;
}

// ── Sanity data types ─────────────────────────────────────────────────────────

interface Category {
  _id: string;
  title: string;
  slug: string;
}

interface Post {
  _id: string;
  title: string;
  slug: string;
  publishedAt: string;
}

interface Author {
  _id: string;
  name: string;
  slug: string;
}

// ── Fetch ─────────────────────────────────────────────────────────────────────

const PUBLISHED_POST_FILTER =
  `_type == "post" && defined(slug.current) && defined(publishedAt) && publishedAt <= now()`;

/**
 * Interactive mode lists categories A→Z and the 30 most recently *published*
 * posts for human picking. Auto mode orders both by `_updatedAt` (most recently
 * modified first) and caps posts at 20 — the selection rule is applied here.
 */
async function fetchData(auto: boolean): Promise<{
  categories: Category[];
  posts: Post[];
  authors: Author[];
  totalPosts: number;
}> {
  const categoriesQuery = auto
    ? `*[_type == "blogCategory" && defined(slug.current)] | order(_updatedAt desc){_id, title, "slug": slug.current}`
    : `*[_type == "blogCategory" && defined(slug.current)] | order(title asc){_id, title, "slug": slug.current}`;
  const postsQuery = auto
    ? `*[${PUBLISHED_POST_FILTER}] | order(_updatedAt desc)[0...20]{_id, title, "slug": slug.current, publishedAt}`
    : `*[${PUBLISHED_POST_FILTER}] | order(publishedAt desc)[0...30]{_id, title, "slug": slug.current, publishedAt}`;

  const [categories, posts, authors, totalPosts] = await Promise.all([
    client.fetch<Category[]>(categoriesQuery),
    client.fetch<Post[]>(postsQuery),
    client.fetch<Author[]>(
      `*[_type == "author" && defined(slug.current)] | order(name asc){_id, name, "slug": slug.current}`
    ),
    client.fetch<number>(`count(*[${PUBLISHED_POST_FILTER}])`),
  ]);
  return { categories, posts, authors, totalPosts };
}

// ── Prompt helpers ────────────────────────────────────────────────────────────

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

function buildLlmsTxt(
  chosenCategories: Category[],
  chosenPosts: Post[],
  authors: Author[]
): string {
  const lines: string[] = [
    "# PakFactory Blog",
    "",
    "> Custom packaging expertise for businesses — boxes, bags, mailers, and specialty packaging manufactured to spec.",
    "",
    blogUrl("/"),
    "",
    "## Categories",
    "",
    ...chosenCategories.map((c) => `- [${c.title}](${blogUrl(`/${c.slug}`)})`),
    "",
    "## Posts",
    "",
    ...chosenPosts.map((p) => `- [${p.title}](${blogUrl(`/${p.slug}`)})`),
    "",
    "## Authors",
    "",
    ...authors.map((a) => `- [${a.name}](${blogUrl(`/author/${a.slug}`)})`),
    "",
    "> This index is manually curated and refreshed quarterly.",
  ];
  return lines.join("\n");
}

// ── Main ──────────────────────────────────────────────────────────────────────

/** Auto rule: all categories when ≤ 10, else the 10 most recently modified. */
const AUTO_CATEGORY_CAP = 10;
/** Auto rule: all posts when ≤ 20, else the 20 most recently modified. */
const AUTO_POST_CAP = 20;

async function main() {
  console.log(`\n🗂  Fetching Sanity data… (dataset: ${dataset}${AUTO ? ", auto mode" : ""})\n`);
  const { categories, posts, authors, totalPosts } = await fetchData(AUTO);

  if (!categories.length) {
    console.error("❌  No published categories found. Publish at least one category first.");
    process.exit(1);
  }
  if (!posts.length) {
    console.error("❌  No published posts found. Publish at least one post first.");
    process.exit(1);
  }

  const rl = createInterface({ input: process.stdin, output: process.stdout });

  try {
    let chosenCategories: Category[];
    let chosenPosts: Post[];

    if (AUTO) {
      // ── Auto selection (most recently modified first) ─────────────────────
      chosenCategories = categories.slice(0, AUTO_CATEGORY_CAP);
      chosenPosts = posts; // query already capped at the AUTO_POST_CAP most recently modified

      console.log("🤖 Auto selection:");
      console.log(
        `   Categories: ${chosenCategories.length}` +
          (categories.length > AUTO_CATEGORY_CAP
            ? ` (${AUTO_CATEGORY_CAP} most recently modified of ${categories.length})`
            : " (all)")
      );
      console.log(
        `   Posts     : ${chosenPosts.length}` +
          (totalPosts > AUTO_POST_CAP
            ? ` (${AUTO_POST_CAP} most recently modified of ${totalPosts})`
            : " (all)")
      );
    } else {
      // ── Interactive selection ──────────────────────────────────────────────
      console.log("── Categories ──────────────────────────────────────────────────");
      categories.forEach((c, i) =>
        console.log(`  ${String(i + 1).padStart(2)}.  ${c.title}  (${c.slug})`)
      );

      console.log("\n── Posts (30 most recent) ──────────────────────────────────────");
      posts.forEach((p, i) => {
        const date = new Date(p.publishedAt).toISOString().slice(0, 10);
        console.log(`  ${String(i + 1).padStart(2)}.  [${date}]  ${p.title}`);
      });

      console.log("\n────────────────────────────────────────────────────────────────\n");

      // ── Pick 5 categories ───────────────────────────────────────────────────
      const catNums = await promptNumbers(
        rl,
        `Select exactly 5 categories (space or comma separated, e.g. "1 3 5 2 4"):\n> `,
        1,
        categories.length,
        { min: 5, max: 5 }
      );
      chosenCategories = catNums.map((n) => categories[n - 1]);

      // ── Pick 10–20 posts ────────────────────────────────────────────────────
      if (posts.length < 10) {
        console.log(`\n  ℹ️  Only ${posts.length} post(s) available — all included automatically.`);
        chosenPosts = posts;
      } else {
        const postNums = await promptNumbers(
          rl,
          `\nSelect 10–20 posts (space or comma separated):\n> `,
          1,
          posts.length,
          { min: 10, max: 20 }
        );
        chosenPosts = postNums.map((n) => posts[n - 1]);
      }
    }

    // ── Preview ───────────────────────────────────────────────────────────────
    const content = buildLlmsTxt(chosenCategories, chosenPosts, authors);
    console.log("\n── Preview ─────────────────────────────────────────────────────\n");
    console.log(content);
    console.log("\n────────────────────────────────────────────────────────────────");

    if (YES) {
      console.log(`\n--yes supplied — writing to Sanity (dataset: ${dataset}) without prompt.`);
    } else {
      const confirm = await rl.question(
        `\nWrite this to Sanity (dataset: ${dataset})? [y/N] `
      );
      if (confirm.trim().toLowerCase() !== "y") {
        console.log("Aborted. Nothing written.");
        process.exit(0);
      }
    }

    // ── Patch Sanity ──────────────────────────────────────────────────────────
    // Target the *published* singleton ID so the blog's published-only client
    // can read it. createIfNotExists is a no-op if the doc already exists;
    // patch then touches only the llmsTxt field, leaving all other fields intact.
    await client.createIfNotExists({ _id: "settings", _type: "settings" });
    await client.patch("settings").set({ llmsTxt: content }).commit();

    console.log(`\n✅  llmsTxt updated on ${dataset}. Webhook revalidation will flush the cache within 5 min.\n`);
  } finally {
    rl.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
