import {
  LLMS_INDEX_QUERY,
  type LlmsIndexData,
  type LlmsIndexLink,
} from "@pakfactory/sanity/queries";
import { getPublishedSanityClient } from "@/lib/sanity/client";
import { isSanityConfigured } from "@/lib/sanity/env";
import { getSiteUrl } from "@/lib/site";

export const revalidate = 3600;

/**
 * The domain's single llms.txt (served at the www app root; exposed publicly at
 * pakfactory.com/llms.txt via nginx `location = /llms.txt`).
 *
 * GENERATED on each revalidation from live Sanity content — case studies and
 * blog share one dataset, so this route aggregates both without cross-service
 * calls. Editorial knobs (Studio → Settings → Crawlers & AI):
 *   • `llmsTxtWww`        — manual override: non-empty ⇒ served verbatim
 *   • `llmsTxtStorefront` — curated Magento links ("Products & Packaging"
 *                            section; omitted while empty)
 * The static skeleton below is only the no-Sanity/error fallback.
 */
const BLOG_URL = process.env.NEXT_PUBLIC_BLOG_URL ?? `${getSiteUrl()}/blog`;

const FALLBACK_LLMS_TXT = `# PakFactory

> PakFactory designs and manufactures custom packaging for brands of all sizes — boxes, bags, mailers, and more.

${getSiteUrl()}

## Case Studies

- [Case Studies](${getSiteUrl()}/case-studies)

## Blog

- [Blog](${BLOG_URL})
`;

function links(
  items: LlmsIndexLink[] | null | undefined,
  base: string,
): string[] {
  return (items ?? [])
    .filter((i): i is { title: string; slug: string } => !!i?.title && !!i?.slug)
    .map((i) => `- [${i.title}](${base}/${i.slug})`);
}

function buildLlmsTxt(data: LlmsIndexData): string {
  const site = getSiteUrl();
  const storefront = data.settings?.llmsTxtStorefront?.trim();

  const lines: string[] = [
    "# PakFactory",
    "",
    "> PakFactory designs and manufactures custom packaging for brands of all sizes — boxes, bags, mailers, and specialty packaging manufactured to spec.",
    "",
    site,
    "",
  ];

  if (storefront) {
    lines.push("## Products & Packaging", "", storefront, "");
  }

  lines.push(
    "## Case Studies",
    "",
    "Real-world examples of how PakFactory has helped brands solve packaging challenges.",
    "",
    `- [All Case Studies](${site}/case-studies)`,
    ...links(data.caseStudies, `${site}/case-studies`),
    "",
    "## Blog",
    "",
    "Packaging insights, industry trends, and design inspiration.",
    "",
    `- [Blog](${BLOG_URL})`,
    ...links(data.categories, BLOG_URL),
    "",
    "### Recent posts",
    "",
    ...links(data.posts, BLOG_URL),
    "",
    "## Optional",
    "",
    `- [Case Studies sitemap](${site}/case-studies/sitemap.xml)`,
    `- [Blog sitemap](${BLOG_URL}/sitemap.xml)`,
    "",
    "> This index is generated from live content and refreshed hourly.",
  );

  return lines.join("\n");
}

async function generateLlmsTxt(): Promise<string> {
  if (!isSanityConfigured()) return FALLBACK_LLMS_TXT;
  try {
    const data =
      await getPublishedSanityClient().fetch<LlmsIndexData>(LLMS_INDEX_QUERY);
    const override = data?.settings?.llmsTxtWww?.trim();
    if (override) return override;
    return buildLlmsTxt(data ?? {});
  } catch {
    return FALLBACK_LLMS_TXT;
  }
}

export async function GET() {
  return new Response(await generateLlmsTxt(), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
