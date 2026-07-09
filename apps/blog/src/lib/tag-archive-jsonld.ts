import {
  breadcrumbList,
  collectionPage,
  itemList,
  jsonLdGraph,
  organization,
  serializeJsonLd,
} from "@pakfactory/seo";
import type { HomePostCard } from "@/lib/blog-home";
import type { TagDocument, TagListFilters } from "@/lib/blog-tag-archive";
import { tagPageHref } from "@/lib/blog-tag-archive";
import { postDetailHref } from "@/lib/blog-post-url";
import { absoluteUrl, getWwwUrl, normalizeSiteUrl } from "@/lib/site";

export function buildTagArchiveJsonLd(
  tag: TagDocument,
  posts: HomePostCard[],
  pageNumber: number,
  filters: TagListFilters,
): string {
  const wwwUrl = normalizeSiteUrl(getWwwUrl());
  const pageUrl = absoluteUrl(tagPageHref(tag.slug, pageNumber, filters));
  const orgId = `${wwwUrl}#organization`;
  const collectionId = `${pageUrl}#collection`;
  const itemListId = `${pageUrl}#itemlist`;
  const pageLabel =
    pageNumber > 1 ? `${tag.title} — Page ${pageNumber}` : tag.title;

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
      tag.descriptionText?.trim() ||
      `Articles tagged ${tag.title} on PakFactory Blog.`,
  });

  const crumbs = breadcrumbList([
    { name: "Blog", url: absoluteUrl("/") },
    { name: tag.title, url: pageUrl },
  ]);

  const list = itemList({
    id: itemListId,
    name: tag.title,
    items: posts.map((post) => ({
      name: post.title,
      url: absoluteUrl(postDetailHref(post.slug, post.categorySlug)),
    })),
  });

  return serializeJsonLd(jsonLdGraph([org, collection, crumbs, list]));
}
