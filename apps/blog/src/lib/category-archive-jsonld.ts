import {
  breadcrumbList,
  collectionPage,
  itemList,
  jsonLdGraph,
  organization,
  serializeJsonLd,
} from "@pakfactory/seo";
import type { HomePostCard } from "@/lib/blog-home";
import type { CategoryDocument } from "@/lib/blog-category-archive";
import { categoryPageHref } from "@/lib/blog-category-archive";
import type { CategoryListFilters } from "@/lib/blog-category-archive";
import { postDetailHref } from "@/lib/blog-post-url";
import { absoluteUrl, getWwwUrl, normalizeSiteUrl } from "@/lib/site";

export function buildCategoryArchiveJsonLd(
  category: CategoryDocument,
  posts: HomePostCard[],
  pageNumber: number,
  filters: CategoryListFilters,
): string {
  const wwwUrl = normalizeSiteUrl(getWwwUrl());
  const pageUrl = absoluteUrl(categoryPageHref(category.slug, pageNumber, filters));
  const orgId = `${wwwUrl}#organization`;
  const collectionId = `${pageUrl}#collection`;
  const itemListId = `${pageUrl}#itemlist`;
  const pageLabel =
    pageNumber > 1 ? `${category.title} — Page ${pageNumber}` : category.title;

  const org = organization({
    name: "PakFactory",
    url: wwwUrl,
    id: orgId,
  });

  const collection = collectionPage({
    id: collectionId,
    name: pageLabel,
    url: pageUrl,
    description:
      category.descriptionText?.trim() ||
      `Articles in ${category.title} from PakFactory Blog.`,
  });

  const crumbs = breadcrumbList([
    { name: "Blog", url: absoluteUrl("/") },
    { name: category.title, url: pageUrl },
  ]);

  const list = itemList({
    id: itemListId,
    name: category.title,
    items: posts.map((post) => ({
      name: post.title,
      url: absoluteUrl(postDetailHref(post.slug, category.slug)),
    })),
  });

  return serializeJsonLd(jsonLdGraph([org, collection, crumbs, list]));
}
