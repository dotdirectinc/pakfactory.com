import { AUTHORS_FOR_SITEMAP_QUERY } from "@pakfactory/sanity/queries";
import { authorHref } from "@/lib/blog-post-url";
import { makeTaxonomySitemap } from "@/lib/sitemap-route";

export const revalidate = 60;

export const GET = makeTaxonomySitemap({
  query: AUTHORS_FOR_SITEMAP_QUERY,
  href: authorHref,
  defaultsKey: "authorDefaults",
  fallbackChangefreq: "monthly",
  fallbackPriority: 0.3,
});
