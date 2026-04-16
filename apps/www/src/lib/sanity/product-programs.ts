import { getSanityClient } from "@/sanity/client";
import { isSanityConfigured } from "@/sanity/env";
import { PRODUCT_PAGE_SLUGS_QUERY } from "@pakfactory/sanity/queries";

export type ProductProgramRow = { slug: string; title: string };

export type ProductProgramsResult =
  | { kind: "not_configured" }
  | { kind: "fetch_failed"; message: string }
  | { kind: "ok"; rows: ProductProgramRow[] };

export async function fetchProductPrograms(): Promise<ProductProgramsResult> {
  if (!isSanityConfigured()) {
    return { kind: "not_configured" };
  }
  try {
    const client = await getSanityClient();
    const rows = await client.fetch<ProductProgramRow[]>(
      PRODUCT_PAGE_SLUGS_QUERY,
    );
    return { kind: "ok", rows: rows ?? [] };
  } catch (err) {
    if (process.env.NODE_ENV === "development") {
      console.error("[products] Sanity fetch failed:", err);
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
