import {
  breadcrumbList,
  collectionPage,
  itemList,
  jsonLdGraph,
  organization,
  serializeJsonLd,
} from "@pakfactory/seo";
import { tagHref } from "@/lib/blog-post-url";
import type { TopicGroup } from "@/lib/blog-topics-index";
import { absoluteUrl, getWwwUrl, normalizeSiteUrl } from "@/lib/site";

const TITLE = "Explore topics";
const DESCRIPTION =
  "Browse PakFactory blog topics across packaging materials, types, finishes, and industries.";

/** CollectionPage + ItemList of every listed topic URL for the /topics index. */
export function buildTopicsIndexJsonLd(
  groups: TopicGroup[],
  description: string = DESCRIPTION,
): string {
  const wwwUrl = normalizeSiteUrl(getWwwUrl());
  const pageUrl = absoluteUrl("/topics");
  const orgId = `${wwwUrl}#organization`;

  const org = organization({ name: "PakFactory", url: wwwUrl, id: orgId });

  const collection = collectionPage({
    id: `${pageUrl}#collection`,
    name: TITLE,
    url: pageUrl,
    description,
  });

  const crumbs = breadcrumbList([
    { name: "Blog", url: absoluteUrl("/") },
    { name: TITLE, url: pageUrl },
  ]);

  const list = itemList({
    id: `${pageUrl}#itemlist`,
    name: TITLE,
    items: groups.flatMap((group) =>
      group.topics.map((topic) => ({
        name: topic.title,
        url: absoluteUrl(tagHref(topic.slug)),
      })),
    ),
  });

  return serializeJsonLd(jsonLdGraph([org, collection, crumbs, list]));
}
