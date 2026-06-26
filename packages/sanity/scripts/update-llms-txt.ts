/**
 * Interactive CLI to curate and publish /llms.txt content to Sanity.
 *
 * Lists all categories and the 30 most-recent posts; prompts you to pick
 * 5 categories and 10–20 posts by number; then patches the `settings`
 * singleton's `llmsTxt` field.
 *
 * Env (repo root .env.local):
 *   NEXT_PUBLIC_SANITY_PROJECT_ID or SANITY_STUDIO_PROJECT_ID
 *   NEXT_PUBLIC_SANITY_DATASET   or SANITY_STUDIO_DATASET
 *   SANITY_API_WRITE_TOKEN       — Editor token with write access
 *   NEXT_PUBLIC_SITE_URL         — Origin (e.g. https://www.pakfactory.com)
 *   NEXT_PUBLIC_BLOG_BASE_PATH   — Path prefix (e.g. /blog), empty for root
 *
 * Run: pnpm update:llms-txt  (from repo root)
 *
 * TODO (future automation): once PostHog / analytics data is available, replace
 * the manual prompts with a quarterly GitHub Action / cron that:
 *   1. Pulls top-5 categories by page-views over the trailing 90 days
 *   2. Pulls top 10–20 posts by page-views over the trailing 90 days
 *   3. Runs this script non-interactively (passing selections as args) and
 *      commits the Sanity patch automatically
 * Until then, run quarterly and curate manually.
 */

import { createClient } from "@sanity/client";
import { config as loadEnv } from "dotenv";
import { createInterface } from "node:readline/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
loadEnv({ path: join(__dirname, "../../../.env.local") });
loadEnv({ path: join(__dirname, "../../../.env") });

// ── Sanity client ─────────────────────────────────────────────────────────────

const projectId =
  process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ||
  process.env.SANITY_STUDIO_PROJECT_ID ||
  "";
const dataset =
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

async function fetchData(): Promise<{ categories: Category[]; posts: Post[]; authors: Author[] }> {
  const [categories, posts, authors] = await Promise.all([
    client.fetch<Category[]>(
      `*[_type == "blogCategory" && defined(slug.current)] | order(title asc){_id, title, "slug": slug.current}`
    ),
    client.fetch<Post[]>(
      `*[_type == "post" && defined(slug.current) && defined(publishedAt) && publishedAt <= now()] | order(publishedAt desc)[0...30]{_id, title, "slug": slug.current, publishedAt}`
    ),
    client.fetch<Author[]>(
      `*[_type == "author" && defined(slug.current)] | order(name asc){_id, name, "slug": slug.current}`
    ),
  ]);
  return { categories, posts, authors };
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

async function main() {
  console.log("\n🗂  Fetching Sanity data…\n");
  const { categories, posts, authors } = await fetchData();

  if (!categories.length) {
    console.error("❌  No published categories found. Publish at least one category first.");
    process.exit(1);
  }
  if (!posts.length) {
    console.error("❌  No published posts found. Publish at least one post first.");
    process.exit(1);
  }

  // ── Display categories ──────────────────────────────────────────────────────
  console.log("── Categories ──────────────────────────────────────────────────");
  categories.forEach((c, i) =>
    console.log(`  ${String(i + 1).padStart(2)}.  ${c.title}  (${c.slug})`)
  );

  // ── Display posts ───────────────────────────────────────────────────────────
  console.log("\n── Posts (30 most recent) ──────────────────────────────────────");
  posts.forEach((p, i) => {
    const date = new Date(p.publishedAt).toISOString().slice(0, 10);
    console.log(`  ${String(i + 1).padStart(2)}.  [${date}]  ${p.title}`);
  });

  console.log("\n────────────────────────────────────────────────────────────────\n");

  const rl = createInterface({ input: process.stdin, output: process.stdout });

  try {
    // ── Pick 5 categories ─────────────────────────────────────────────────────
    const catNums = await promptNumbers(
      rl,
      `Select exactly 5 categories (space or comma separated, e.g. "1 3 5 2 4"):\n> `,
      1,
      categories.length,
      { min: 5, max: 5 }
    );
    const chosenCategories = catNums.map((n) => categories[n - 1]);

    // ── Pick 10–20 posts ──────────────────────────────────────────────────────
    let chosenPosts: Post[];
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

    // ── Preview ───────────────────────────────────────────────────────────────
    const content = buildLlmsTxt(chosenCategories, chosenPosts, authors);
    console.log("\n── Preview ─────────────────────────────────────────────────────\n");
    console.log(content);
    console.log("\n────────────────────────────────────────────────────────────────");

    const confirm = await rl.question(
      `\nWrite this to Sanity (dataset: ${dataset})? [y/N] `
    );
    if (confirm.trim().toLowerCase() !== "y") {
      console.log("Aborted. Nothing written.");
      process.exit(0);
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
