import { collectionPage, itemList } from "@pakfactory/seo";
import type { TagDocument, TagListFilters } from "@/lib/blog-tag-archive";
import { tagPageHref } from "@/lib/blog-tag-url";
import {
  blogBreadcrumbList,
  pakfactoryOrganization,
  serializeBlogJsonLd,
} from "@/lib/blog-jsonld";
import type { TopicListingPost } from "@/lib/listing-posts";
import { absoluteUrl } from "@/lib/site";

export function buildTagArchiveJsonLd(
  tag: TagDocument,
  posts: TopicListingPost[],
  pageNumber: number,
  filters: TagListFilters,
): string {
  const pageUrl = absoluteUrl(tagPageHref(tag.slug, pageNumber, filters));
  const collectionId = `${pageUrl}#collection`;
  const itemListId = `${pageUrl}#itemlist`;
  const pageLabel =
    pageNumber > 1 ? `${tag.title} — Page ${pageNumber}` : tag.title;
  const { org } = pakfactoryOrganization();

  const collection = collectionPage({
    id: collectionId,
    name: pageLabel,
    url: pageUrl,
    description:
      tag.descriptionText?.trim() ||
      `Articles tagged ${tag.title} on PakFactory Blog.`,
  });

  const crumbs = blogBreadcrumbList([{ name: tag.title, url: pageUrl }]);

  const list = itemList({
    id: itemListId,
    name: tag.title,
    items: posts.map((post) => ({
      name: post.title,
      url: absoluteUrl(post.href),
    })),
  });

  return serializeBlogJsonLd([org, collection, crumbs, list]);
}
