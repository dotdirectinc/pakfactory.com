import { getSiteUrl } from "@/lib/site";

const BLOG_URL = process.env.NEXT_PUBLIC_BLOG_URL ?? "https://blog.pakfactory.com";

export function GET() {
  const siteUrl = getSiteUrl();

  const body = `# PakFactory

> PakFactory designs and manufactures custom packaging for brands of all sizes — boxes, bags, mailers, and more.

## Case Studies

Real-world examples of how PakFactory has helped brands solve packaging challenges.

- [Case Studies](${siteUrl}/case-studies)

## Blog

Packaging insights, industry trends, and design inspiration.

- [Blog](${BLOG_URL})

## Contact

- [Get A Quote](${siteUrl}/contact)
- Site: ${siteUrl}
`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=3600",
    },
  });
}
