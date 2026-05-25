import {
  breadcrumbList,
  collectionPage,
  itemList,
  jsonLdGraph,
  organization,
  serializeJsonLd,
} from "@pakfactory/seo";
import type { HomePostCard } from "@/lib/blog-home";
import { archivePageHref } from "@/lib/blog-archive";
import { getSiteUrl, getWwwUrl, normalizeSiteUrl } from "@/lib/site";

const ARCHIVE_TITLE = "All posts";

export function buildAllArchiveJsonLd(
  posts: HomePostCard[],
  pageNumber: number,
): string {
  const siteUrl = normalizeSiteUrl(getSiteUrl());
  const wwwUrl = normalizeSiteUrl(getWwwUrl());
  const pageUrl = `${siteUrl}${archivePageHref(pageNumber)}`;
  const orgId = `${wwwUrl}#organization`;
  const collectionId = `${pageUrl}#collection`;
  const itemListId = `${pageUrl}#itemlist`;

  const org = organization({
    name: "PakFactory",
    url: wwwUrl,
    id: orgId,
  });

  const collection = collectionPage({
    id: collectionId,
    name: pageNumber > 1 ? `${ARCHIVE_TITLE} — Page ${pageNumber}` : ARCHIVE_TITLE,
    url: pageUrl,
    description:
      "Browse every published PakFactory blog post in chronological order.",
  });

  const crumbs = breadcrumbList([
    { name: "Blog", url: `${siteUrl}/` },
    { name: ARCHIVE_TITLE, url: pageUrl },
  ]);

  const list = itemList({
    id: itemListId,
    name: ARCHIVE_TITLE,
    items: posts.map((post) => ({
      name: post.title,
      url: `${siteUrl}/${post.slug}`,
    })),
  });

  return serializeJsonLd(jsonLdGraph([org, collection, crumbs, list]));
}
