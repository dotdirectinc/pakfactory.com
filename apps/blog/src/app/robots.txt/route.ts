import { fetchBlogGlobalSettings } from "@/lib/blog-global-settings";
import { absoluteUrl } from "@/lib/site";

const DEFAULT_ROBOTS_TXT = `User-agent: *
Allow: /

# AI answering / search — allowed
User-agent: OAI-SearchBot
Allow: /

User-agent: Claude-User
Allow: /

User-agent: Claude-SearchBot
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: Google-Extended
Allow: /

# AI training crawlers — blocked
User-agent: GPTBot
Disallow: /

User-agent: ClaudeBot
Disallow: /

Sitemap: ${absoluteUrl("/sitemap.xml")}
`;

export async function GET() {
  const settings = await fetchBlogGlobalSettings();
  const content = settings?.robotsTxt?.trim() ?? DEFAULT_ROBOTS_TXT;

  return new Response(content, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
    },
  });
}
