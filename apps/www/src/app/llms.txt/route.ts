import { getSiteUrl } from "@/lib/site";

const BLOG_URL = process.env.NEXT_PUBLIC_BLOG_URL ?? "https://blog.pakfactory.com";

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

export function GET() {
  return new Response(DEFAULT_LLMS_TXT, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
    },
  });
}
