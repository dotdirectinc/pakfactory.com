import { fetchBlogGlobalSettings } from "@/lib/blog-global-settings";
import { absoluteUrl } from "@/lib/site";

const DEFAULT_LLMS_TXT = `# PakFactory Blog

> Packaging expertise for businesses — custom boxes, bags, and specialty packaging manufactured to spec.

${absoluteUrl("/")}

## Content

This index is manually curated and refreshed quarterly.
Add content by editing the llms.txt field in Sanity Studio → Settings → Crawlers & AI.
`;

export async function GET() {
  const settings = await fetchBlogGlobalSettings();
  const content = settings?.llmsTxt?.trim() ?? DEFAULT_LLMS_TXT;

  return new Response(content, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
    },
  });
}
