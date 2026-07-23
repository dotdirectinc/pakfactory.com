import { BLOG_LANDING_PAGES_SITEMAP_QUERY } from "@pakfactory/sanity/queries";
import { blogPageDetailHref } from "@/lib/blog-page";
import { absoluteUrl } from "@/lib/site";
import { makeTaxonomySitemap } from "@/lib/sitemap-route";

export const revalidate = 60;

/**
 * Indexable non-post routes: home + code routes, then CMS landing/static pages.
 * `/all` is the posts archive index — it changes whenever a post publishes.
 * `/search` is noindex, so it is excluded.
 *
 * `blogPage` has no `lastModified` field, so `publishedAt` is the only real
 * content date available (PROD-2194). The three code routes have none at all.
 */
export const GET = makeTaxonomySitemap({
  query: BLOG_LANDING_PAGES_SITEMAP_QUERY,
  href: blogPageDetailHref,
  lastmodFrom: (page) => page.publishedAt,
  staticEntries: [
    { loc: absoluteUrl("/") },
    { loc: absoluteUrl("/all") },
    { loc: absoluteUrl("/contribute") },
  ],
});
