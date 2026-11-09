/**
 * Slim /compare matrix loads (Website PRD §4.7 R27). Card + properties only —
 * no PDP offer resolution, peers, showcase, or rules catalog.
 */
import 'server-only';

import {
    CATALOG_CUSTOMIZATION_BY_CATEGORY_HANDLE_QUERY,
    CATALOG_PRODUCT_CARD_FIELDS,
    PRODUCT_LISTED,
    type CatalogLibraryOptionDoc,
    type CatalogProductDoc,
} from '@pakfactory/sanity/queries';

import {parseCustomizationBookmarkId} from '@/lib/bookmarks/bookmark-id';
import {
    mapSanityLibraryOption,
    mapSanityProduct,
} from '@/lib/catalog/map-sanity';
import type {CustomizationLibraryItem, Product} from '@/lib/catalog/types';
import {
    customizationLibraryCompareData,
    productCompareData,
    type CompareData,
} from '@/lib/compare/compare-data';
import {draftAwareClient, readThrough} from '@/lib/sanity/draft-aware';
import {isSanityConfigured} from '@/lib/sanity/env';
import {sanityCache, sanityReadFailed} from '@/lib/sanity/sanity-cache';
import {
    WWW_CATALOG_CUSTOMIZATIONS_CACHE_TAG,
    WWW_CATALOG_PRODUCTS_CACHE_TAG,
    WWW_CONTENT_REVALIDATE_SECONDS,
} from '@/lib/www-cache';

export {parseCompareIds} from '@/lib/compare/compare-ids';

/** Card fields + PLP properties + the product's own customization list (no rules expand). */
const COMPARE_PRODUCTS_QUERY = /* groq */ `*[
  _type == "product" &&
  slug.current in $slugs &&
  ${PRODUCT_LISTED}
]{
  ${CATALOG_PRODUCT_CARD_FIELDS},
  "properties": properties[defined(property)]{
    "label": property->title,
    "propertySlug": property->slug.current,
    "values": values[]->{
      title,
      "slug": slug.current
    }
  },
  "availableCustomizations": availableCustomizations[defined(customization)]{
    preselected,
    "customization": customization->{
      _id,
      title,
      shortName,
      "slug": slug.current,
      appearsIn,
      "category": type->category->{
        title,
        "slug": slug.current
      },
      "type": type->{
        title,
        "slug": slug.current,
        "category": category->{
          title,
          "slug": slug.current
        }
      }
    }
  }
}`;

async function fetchCompareProducts(slugs: string[]): Promise<Product[]> {
    if (!slugs.length || !isSanityConfigured()) return [];
    try {
        const docs = await (await draftAwareClient()).fetch<CatalogProductDoc[]>(
            COMPARE_PRODUCTS_QUERY,
            {slugs},
        );
        const bySlug = new Map<string, Product>();
        for (const doc of docs ?? []) {
            const product = mapSanityProduct(doc);
            if (product) bySlug.set(product.slug, product);
        }
        return slugs.flatMap((slug) => bySlug.get(slug) ?? []);
    } catch (err) {
        throw sanityReadFailed('[compare] Sanity products fetch failed:', err);
    }
}

function getCachedCompareProducts(slugs: string[]) {
    const key = slugs.map((s) => s.trim().toLowerCase()).filter(Boolean).join(',');
    return sanityCache(
        () => fetchCompareProducts(slugs),
        [`www-compare-products:${key}`],
        {
            revalidate: WWW_CONTENT_REVALIDATE_SECONDS,
            tags: [WWW_CATALOG_PRODUCTS_CACHE_TAG],
        },
    )();
}

async function fetchCompareCustomization(
    category: string,
    handle: string,
): Promise<CustomizationLibraryItem | null> {
    if (!isSanityConfigured()) return null;
    try {
        const doc = await (await draftAwareClient()).fetch<CatalogLibraryOptionDoc | null>(
            CATALOG_CUSTOMIZATION_BY_CATEGORY_HANDLE_QUERY,
            {category, handle},
        );
        return doc ? mapSanityLibraryOption(doc) : null;
    } catch (err) {
        throw sanityReadFailed('[compare] Sanity customization fetch failed:', err);
    }
}

function getCachedCompareCustomization(category: string, handle: string) {
    return sanityCache(
        () => fetchCompareCustomization(category, handle),
        [`www-compare-customization:${category}:${handle}`],
        {
            revalidate: WWW_CONTENT_REVALIDATE_SECONDS,
            tags: [WWW_CATALOG_CUSTOMIZATIONS_CACHE_TAG],
        },
    )();
}

/** Build CompareData for one group from a slim catalog read. */
export async function loadCompareData(
    type: 'products' | 'customizations',
    ids: string[],
): Promise<CompareData | null> {
    if (!ids.length) return null;

    if (type === 'products') {
        const products = await readThrough(
            () => fetchCompareProducts(ids),
            () => getCachedCompareProducts(ids),
        );
        return products.length ? productCompareData(products) : null;
    }

    const loaded = await Promise.all(
        ids.map(async (id) => {
            const parsed = parseCustomizationBookmarkId(id);
            if (!parsed) return null;
            return readThrough(
                () => fetchCompareCustomization(parsed.category, parsed.slug),
                () => getCachedCompareCustomization(parsed.category, parsed.slug),
            );
        }),
    );
    const byId = new Map(
        loaded
            .filter((item): item is CustomizationLibraryItem => Boolean(item))
            .map((item) => [`${item.categoryValue}/${item.slug}`, item]),
    );
    const ordered = ids.flatMap((id) => {
        const item = byId.get(id);
        return item ? [item] : [];
    });
    return ordered.length ? customizationLibraryCompareData(ordered) : null;
}
