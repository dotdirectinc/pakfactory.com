import { getSanityClient } from "@/lib/sanity/client";
import { isSanityConfigured } from "@/lib/sanity/env";
import { ALL_PRODUCT_PAGES_WITH_PRODUCTS_QUERY } from "@pakfactory/sanity/queries";

const SOLUTION_TYPE_LABEL: Record<string, string> = {
  standard: "Standard",
  industry: "Industry",
};

export function solutionTypeLabel(
  value: string | null | undefined,
): string {
  if (value == null || value === "") return "Product Line";
  return SOLUTION_TYPE_LABEL[value] ?? value;
}

export type ProductCatalogItem = {
  _id: string;
  sku: string;
  pageSlug: string;
  collectionSlug: string | null;
  name: string;
  description: string | null;
  thumbUrl: string | null;
  thumbAlt: string | null;
};

export type ProductCatalogPage = {
  _id: string;
  title: string;
  slug: string;
  heroHeadline: string;
  solutionType?: string | null;
  products: ProductCatalogItem[];
};

export type ProductCatalogResult =
  | { kind: "not_configured" }
  | { kind: "fetch_failed"; message: string }
  | { kind: "ok"; pages: ProductCatalogPage[] };

export async function fetchProductCatalog(): Promise<ProductCatalogResult> {
  if (!isSanityConfigured()) {
    return { kind: "not_configured" };
  }
  try {
    const client = await getSanityClient();
    const pages = await client.fetch<ProductCatalogPage[]>(
      ALL_PRODUCT_PAGES_WITH_PRODUCTS_QUERY,
    );
    return { kind: "ok", pages: pages ?? [] };
  } catch (err) {
    if (process.env.NODE_ENV === "development") {
      console.error("[product-catalog] Sanity fetch failed:", err);
    }
    const message =
      err instanceof Error
        ? err.message
        : typeof err === "string"
          ? err
          : "Unknown error";
    return { kind: "fetch_failed", message };
  }
}
