/**
 * robots.txt for the www app — reachable ONLY at the Vercel origin host
 * (`pakfactory-com-www.vercel.app`) and preview deployments, including the fixed
 * stakeholder staging host `staging.pakfactory.com` (PROD-2404).
 *
 * The public/canonical `pakfactory.com/robots.txt` is served by **Magento** (the
 * apex, RFC 9309 per-host) and is NOT this file. nginx on the Magento boxes proxies
 * only `/case-studies*` to this app — never `/robots.txt` — so the only clients that
 * ever read this route are crawlers hitting the Vercel origin (or a preview URL)
 * **directly**. Those hosts must not be crawled: they serve content identical to the
 * canonical `pakfactory.com` and would create duplicate-content / origin-leak in
 * Google and AI answer engines (PROD-2207).
 *
 * So: disallow everything here. This cannot affect the canonical host (different
 * robots.txt, served by Magento). If www ever gets its own PUBLIC root domain that
 * should be crawlable, this blanket disallow must be revisited (e.g. gate on the
 * request Host) — today no such host exists.
 */
const robots = `# Vercel origin / preview host — not the canonical site.
# Canonical robots.txt is served by Magento at https://pakfactory.com/robots.txt.
# Disallow all crawling of this origin to avoid duplicate-content indexing (PROD-2207).
User-agent: *
Disallow: /
`;

export function GET() {
  return new Response(robots, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
    },
  });
}
