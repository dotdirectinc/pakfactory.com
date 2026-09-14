import {
  ALGOLIA_INDEX_NAME,
  type AlgoliaPostRecord,
} from "@pakfactory/sanity/algolia/post-record";
import {
  CONTENT_CASE_STUDIES_INDEX,
  CONTENT_CUSTOMIZATIONS_INDEX,
  CONTENT_PRODUCTS_INDEX,
  type AlgoliaContentRecord,
} from "@pakfactory/sanity/algolia/content-indexes";
import { blogPostHref, wwwPath } from "./content-origins";
import { getAlgoliaSearchClient, isAlgoliaSearchConfigured } from "./algolia-client";
import type { AdminSearchHit } from "./types";

export type ContentSearchBundle = {
  products: AdminSearchHit[];
  customizations: AdminSearchHit[];
  posts: AdminSearchHit[];
  caseStudies: AdminSearchHit[];
  available: boolean;
  source: "algolia" | "none";
};

const EMPTY: ContentSearchBundle = {
  products: [],
  customizations: [],
  posts: [],
  caseStudies: [],
  available: false,
  source: "none",
};

const HITS = 8;

function productHit(record: AlgoliaContentRecord): AdminSearchHit | null {
  if (!record.slug) return null;
  return {
    id: record.objectID,
    kind: "product",
    title: record.title || record.slug,
    subtitle: [record.shortName, "Product"].filter(Boolean).join(" · "),
    href: wwwPath(`/products/${record.slug}`),
    external: true,
    badge: "Product",
  };
}

function customizationHit(record: AlgoliaContentRecord): AdminSearchHit | null {
  if (!record.slug || !record.categorySlug) return null;
  return {
    id: record.objectID,
    kind: "customization",
    title: record.title || record.slug,
    subtitle: [record.typeTitle, "Customization"].filter(Boolean).join(" · "),
    href: wwwPath(`/customizations/${record.categorySlug}/${record.slug}`),
    external: true,
    badge: "Option",
  };
}

function caseStudyHit(record: AlgoliaContentRecord): AdminSearchHit | null {
  if (!record.slug) return null;
  return {
    id: record.objectID,
    kind: "caseStudy",
    title: record.title || record.slug,
    subtitle: record.clientName || "Case study",
    href: wwwPath(`/case-studies/${record.slug}`),
    external: true,
    badge: "Case study",
  };
}

function postHit(record: AlgoliaPostRecord): AdminSearchHit | null {
  if (!record.slug) return null;
  return {
    id: record.objectID,
    kind: "post",
    title: record.title || record.slug,
    subtitle: [record.category?.title, "Blog"].filter(Boolean).join(" · "),
    href: blogPostHref(record.slug),
    external: true,
    badge: "Post",
  };
}

export async function searchContentViaAlgolia(
  query: string,
): Promise<ContentSearchBundle> {
  const q = query.trim();
  if (!q || !isAlgoliaSearchConfigured()) return EMPTY;

  const client = getAlgoliaSearchClient();
  if (!client) return EMPTY;

  const { results } = await client.search({
    requests: [
      {
        indexName: CONTENT_PRODUCTS_INDEX,
        query: q,
        hitsPerPage: HITS,
      },
      {
        indexName: CONTENT_CUSTOMIZATIONS_INDEX,
        query: q,
        hitsPerPage: HITS,
      },
      {
        indexName: ALGOLIA_INDEX_NAME,
        query: q,
        hitsPerPage: HITS,
        attributesToRetrieve: [
          "objectID",
          "title",
          "slug",
          "category",
        ],
      },
      {
        indexName: CONTENT_CASE_STUDIES_INDEX,
        query: q,
        hitsPerPage: HITS,
      },
    ],
  });

  const [productsRes, customRes, postsRes, casesRes] = results;

  const products =
    productsRes && "hits" in productsRes
      ? (productsRes.hits as AlgoliaContentRecord[])
          .map(productHit)
          .filter((h): h is AdminSearchHit => Boolean(h))
      : [];
  const customizations =
    customRes && "hits" in customRes
      ? (customRes.hits as AlgoliaContentRecord[])
          .map(customizationHit)
          .filter((h): h is AdminSearchHit => Boolean(h))
      : [];
  const posts =
    postsRes && "hits" in postsRes
      ? (postsRes.hits as AlgoliaPostRecord[])
          .map(postHit)
          .filter((h): h is AdminSearchHit => Boolean(h))
      : [];
  const caseStudies =
    casesRes && "hits" in casesRes
      ? (casesRes.hits as AlgoliaContentRecord[])
          .map(caseStudyHit)
          .filter((h): h is AdminSearchHit => Boolean(h))
      : [];

  return {
    products,
    customizations,
    posts,
    caseStudies,
    available: true,
    source: "algolia",
  };
}
