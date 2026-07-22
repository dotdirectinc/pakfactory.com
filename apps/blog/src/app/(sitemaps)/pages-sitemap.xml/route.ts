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
 * ⚠️ `defaultsKey` is `postDefaults`, not `pageDefaults`. That is the behaviour
 * this route shipped with and is preserved verbatim here — but `pageDefaults`
 * does exist (PROD-2116) and is very likely what was intended. Flagged rather
 * than changed, because switching it would alter live sitemap priority and
 * changefreq values.
 */
export const GET = makeTaxonomySitemap({
  query: BLOG_LANDING_PAGES_SITEMAP_QUERY,
  href: blogPageDetailHref,
  defaultsKey: "postDefaults",
  fallbackChangefreq: "monthly",
  fallbackPriority: 0.7,
  priorityFactor: 0.7,
  staticEntries: [
    { loc: absoluteUrl("/"), changefreq: "daily", priority: 1 },
    { loc: absoluteUrl("/all"), changefreq: "daily", priority: 0.8 },
    { loc: absoluteUrl("/contribute"), changefreq: "monthly", priority: 0.5 },
  ],
});
