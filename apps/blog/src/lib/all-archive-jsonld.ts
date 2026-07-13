import { collectionPage, itemList } from "@pakfactory/seo";
import type { HomePostCard } from "@/lib/blog-home";
import { archivePageHref } from "@/lib/blog-archive";
import {
  blogBreadcrumbList,
  pakfactoryOrganization,
  serializeBlogJsonLd,
} from "@/lib/blog-jsonld";
import { postDetailHref } from "@/lib/blog-post-url";
import { absoluteUrl } from "@/lib/site";

const ARCHIVE_TITLE = "All posts";

export function buildAllArchiveJsonLd(
  posts: HomePostCard[],
  pageNumber: number,
): string {
  const pageUrl = absoluteUrl(archivePageHref(pageNumber));
  const collectionId = `${pageUrl}#collection`;
  const itemListId = `${pageUrl}#itemlist`;
  const { org } = pakfactoryOrganization();

  const collection = collectionPage({
    id: collectionId,
    name: pageNumber > 1 ? `${ARCHIVE_TITLE} — Page ${pageNumber}` : ARCHIVE_TITLE,
    url: pageUrl,
    description:
      "Browse every published PakFactory blog post in chronological order.",
  });

  const crumbs = blogBreadcrumbList([
    { name: ARCHIVE_TITLE, url: pageUrl },
  ]);

  const list = itemList({
    id: itemListId,
    name: ARCHIVE_TITLE,
    items: posts.map((post) => ({
      name: post.title,
      url: absoluteUrl(postDetailHref(post.slug, post.categorySlug)),
    })),
  });

  return serializeBlogJsonLd([org, collection, crumbs, list]);
}
