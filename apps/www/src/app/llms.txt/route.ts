import { getPublishedSanityClient } from "@/lib/sanity/client";
import { isSanityConfigured } from "@/lib/sanity/env";
import { getSiteUrl } from "@/lib/site";

export const revalidate = 300;

/**
 * Site-wide LLM index. Content is curated in Sanity (Settings → Crawlers & AI →
 * "llms.txt (Website / Case Studies)", regenerated via `pnpm update:llms-txt:www`);
 * the hardcoded skeleton below is only the fallback when the field is empty or
 * Sanity is unreachable. Served at the app root and exposed publicly at
 * pakfactory.com/llms.txt through the nginx `location = /llms.txt` proxy.
 */
const BLOG_URL = process.env.NEXT_PUBLIC_BLOG_URL ?? `${getSiteUrl()}/blog`;

const DEFAULT_LLMS_TXT = `# PakFactory

> PakFactory designs and manufactures custom packaging for brands of all sizes — boxes, bags, mailers, and more.

${getSiteUrl()}

## Case Studies

Real-world examples of how PakFactory has helped brands solve packaging challenges.

- [Case Studies](${getSiteUrl()}/case-studies)

## Blog

Packaging insights, industry trends, and design inspiration.

- [Blog](${BLOG_URL})
`;

async function fetchCuratedLlmsTxt(): Promise<string | null> {
  if (!isSanityConfigured()) return null;
  try {
    const value = await getPublishedSanityClient().fetch<string | null>(
      `*[_id == "settings"][0].llmsTxtWww`,
    );
    return value?.trim() || null;
  } catch {
    return null;
  }
}

export async function GET() {
  const curated = await fetchCuratedLlmsTxt();
  return new Response(curated ?? DEFAULT_LLMS_TXT, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
    },
  });
}
