import { AUTHORS_FOR_SITEMAP_QUERY } from "@pakfactory/sanity/queries";
import { authorHref } from "@/lib/blog-post-url";
import { makeTaxonomySitemap } from "@/lib/sitemap-route";

export const revalidate = 60;

// No `lastmod`: an author document carries no content date, and `_updatedAt`
// bumps on any write (PROD-2194).
export const GET = makeTaxonomySitemap({
  query: AUTHORS_FOR_SITEMAP_QUERY,
  href: authorHref,
});
