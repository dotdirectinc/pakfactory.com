import { CATEGORIES_FOR_SITEMAP_QUERY } from "@pakfactory/sanity/queries";
import { categoryHref } from "@/lib/blog-post-url";
import { makeTaxonomySitemap } from "@/lib/sitemap-route";

export const revalidate = 60;

export const GET = makeTaxonomySitemap({
  query: CATEGORIES_FOR_SITEMAP_QUERY,
  href: categoryHref,
  defaultsKey: "categoryDefaults",
  fallbackChangefreq: "weekly",
  fallbackPriority: 0.7,
});
