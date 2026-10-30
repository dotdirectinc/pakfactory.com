import { collectionPage, itemList } from "@pakfactory/seo";
import type { HomePostCard } from "@/lib/blog-home";
import type { CategoryDocument } from "@/lib/blog-category-archive";
import { categoryPageHref } from "@/lib/blog-category-archive";
import type { CategoryListFilters } from "@/lib/blog-category-archive";
import {
  blogBreadcrumbList,
  pakfactoryOrganization,
  serializeBlogJsonLd,
} from "@/lib/blog-jsonld";
import { postDetailHref } from "@/lib/blog-post-url";
import { absoluteUrl } from "@/lib/site";

export function buildCategoryArchiveJsonLd(
  category: CategoryDocument,
  posts: HomePostCard[],
  pageNumber: number,
  filters: CategoryListFilters,
): string {
  const pageUrl = absoluteUrl(categoryPageHref(category.slug, pageNumber, filters));
  const collectionId = `${pageUrl}#collection`;
  const itemListId = `${pageUrl}#itemlist`;
  const pageLabel =
    pageNumber > 1 ? `${category.title} — Page ${pageNumber}` : category.title;
  // ⚠️ No settings in scope, so this falls back to the literal company name.
  // The builder is called from a sync view component; reading Global Settings
  // here means threading it down from the route. Left for PROD-3230 rather than
  // changing a live blog view's signature (the other three call sites read the
  // editor's value).
  const { org } = pakfactoryOrganization();

  const collection = collectionPage({
    id: collectionId,
    name: pageLabel,
    url: pageUrl,
    description:
      category.descriptionText?.trim() ||
      `Articles in ${category.title} from PakFactory Blog.`,
  });

  const crumbs = blogBreadcrumbList([
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

  return serializeBlogJsonLd([org, collection, crumbs, list]);
}
