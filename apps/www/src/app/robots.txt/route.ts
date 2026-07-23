import { absoluteUrl } from "@/lib/site";

const robots = `User-agent: *
Allow: /case-studies
Disallow: /

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

# PROD-2198: AI training crawlers (formerly GPTBot / ClaudeBot with Disallow: /)
# are no longer blocked here — they fall under the User-agent: * group above
# (Allow: /case-studies, Disallow: everything else), matching the domain-wide
# apex robots.txt served by Magento.

Sitemap: ${absoluteUrl("/sitemap.xml")}
`;

export function GET() {
  return new Response(robots, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
    },
  });
}
