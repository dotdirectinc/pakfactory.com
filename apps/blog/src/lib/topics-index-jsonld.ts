import { collectionPage, itemList } from "@pakfactory/seo";
import { tagHref } from "@/lib/blog-post-url";
import type { TopicGroup } from "@/lib/blog-topics-index";
import {
  blogBreadcrumbList,
  pakfactoryOrganization,
  serializeBlogJsonLd,
} from "@/lib/blog-jsonld";
import { absoluteUrl } from "@/lib/site";

const TITLE = "Explore topics";
const DESCRIPTION =
  "Browse PakFactory blog topics across packaging materials, types, finishes, and industries.";

/** CollectionPage + ItemList of every listed topic URL for the /topics index. */
export function buildTopicsIndexJsonLd(
  groups: TopicGroup[],
  description: string = DESCRIPTION,
): string {
  const pageUrl = absoluteUrl("/topics");
  const { org } = pakfactoryOrganization();

  const collection = collectionPage({
    id: `${pageUrl}#collection`,
    name: TITLE,
    url: pageUrl,
    description,
  });

  const crumbs = blogBreadcrumbList([{ name: TITLE, url: pageUrl }]);

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

  return serializeBlogJsonLd([org, collection, crumbs, list]);
}
