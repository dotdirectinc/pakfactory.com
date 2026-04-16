import type { SanityClient } from "@sanity/client";
import {
  PRODUCT_COLLECTION_REFS_FOR_PAGE_ID_QUERY,
  PRODUCT_COLLECTIONS_BY_IDS_QUERY,
  PRODUCT_PAGE_BY_SLUG_QUERY,
} from "./queries";

export type ProductPageCollectionSummary = {
  _id: string;
  title: string | null;
  slug: string | null;
  /** Page-level image from `relatedCollections[].image` (manual entries only). */
  thumbUrl?: string | null;
  thumbAlt?: string | null;
};

export type ProductPageBySlugResult = {
  _id: string;
  title: string;
  slug: string;
  heroHeadline: string | null;
  solutionType: string;
  standardBody: unknown;
  industryBody: unknown;
  body: unknown;
  seo: unknown;
  includeCollectionsFromProducts: boolean | null;
  manualCollections: ProductPageCollectionSummary[] | null;
};

/**
 * Manual `relatedCollections` order first; extras deduped by `_id`, sorted by title.
 * Same merge as `getCollectionsForProductPage` when `includeCollectionsFromProducts` is true.
 */
export function mergeManualAndExtraCollections(
  manual: ProductPageCollectionSummary[],
  extra: ProductPageCollectionSummary[],
): ProductPageCollectionSummary[] {
  const seen = new Set(manual.map((c) => c._id));
  const rest = extra
    .filter((c) => c._id && !seen.has(c._id))
    .sort((a, b) => (a.title ?? "").localeCompare(b.title ?? ""));
  return [...manual, ...rest];
}

/**
 * Manual `relatedCollections` first; when `includeCollectionsFromProducts` is true,
 * appends other collections used by products that reference this page (deduped, sorted by title).
 */
export async function getCollectionsForProductPage(
  client: SanityClient,
  slug: string,
): Promise<{
  page: ProductPageBySlugResult | null;
  manual: ProductPageCollectionSummary[];
  merged: ProductPageCollectionSummary[];
}> {
  const page = await client.fetch<ProductPageBySlugResult | null>(
    PRODUCT_PAGE_BY_SLUG_QUERY,
    { slug },
  );
  if (!page) {
    return { page: null, manual: [], merged: [] };
  }

  const manual = (page.manualCollections ?? []).filter((c) => c?._id);

  if (!page.includeCollectionsFromProducts) {
    return { page, manual, merged: manual };
  }

  const refs = await client.fetch<string[] | null>(
    PRODUCT_COLLECTION_REFS_FOR_PAGE_ID_QUERY,
    { pageId: page._id },
  );
  const ids = (refs ?? []).filter(Boolean);
  if (ids.length === 0) {
    return { page, manual, merged: manual };
  }

  const extras = await client.fetch<ProductPageCollectionSummary[] | null>(
    PRODUCT_COLLECTIONS_BY_IDS_QUERY,
    { ids },
  );
  const extraList = (extras ?? []).filter((c) => c?._id);

  return {
    page,
    manual,
    merged: mergeManualAndExtraCollections(manual, extraList),
  };
}
