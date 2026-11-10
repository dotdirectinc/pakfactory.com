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

/**
 * Library option by category + handle, plus Studio benefits for Why use it (PROD-3307).
 * Built from the catalog single-option query so card/attrs stay in sync.
 */
const COMPARE_CUSTOMIZATION_QUERY = CATALOG_CUSTOMIZATION_BY_CATEGORY_HANDLE_QUERY.replace(
    /\}\s*$/,
    `,\n  "benefitsTitle": benefits.title,\n  "benefitsBody": benefits.body\n}`,
);

/**
 * Batch matrix load: one GROQ for all category/handle pairs (filter exact ids in JS).
 * Same projection as {@link COMPARE_CUSTOMIZATION_QUERY}.
 */
const COMPARE_CUSTOMIZATIONS_BATCH_QUERY = COMPARE_CUSTOMIZATION_QUERY.replace(
    /slug\.current == \$handle &&\s*type->category->slug\.current == \$category\s*\]\[0\]\{/,
    'slug.current in $handles &&\n  type->category->slug.current in $categories\n]{',
);

if (
    COMPARE_CUSTOMIZATIONS_BATCH_QUERY.includes('][0]{') ||
    !COMPARE_CUSTOMIZATIONS_BATCH_QUERY.includes('in $handles')
) {
    throw new Error('[compare] COMPARE_CUSTOMIZATIONS_BATCH_QUERY rewrite failed');
}

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

async function fetchCompareCustomizations(ids: string[]): Promise<CustomizationLibraryItem[]> {
    const parsed = ids.flatMap((id) => {
        const p = parseCustomizationBookmarkId(id);
        return p ? [p] : [];
    });
    if (!parsed.length || !isSanityConfigured()) return [];
    const handles = [...new Set(parsed.map((p) => p.slug))];
    const categories = [...new Set(parsed.map((p) => p.category))];
    const want = new Set(parsed.map((p) => `${p.category}/${p.slug}`));
    try {
        const docs = await (await draftAwareClient()).fetch<CatalogLibraryOptionDoc[]>(
            COMPARE_CUSTOMIZATIONS_BATCH_QUERY,
            {handles, categories},
        );
        const byId = new Map<string, CustomizationLibraryItem>();
        for (const doc of docs ?? []) {
            const item = mapSanityLibraryOption(doc);
            if (!item) continue;
            const id = `${item.categoryValue}/${item.slug}`;
            if (want.has(id)) byId.set(id, item);
        }
        return ids.flatMap((id) => {
            const item = byId.get(id);
            return item ? [item] : [];
        });
    } catch (err) {
        throw sanityReadFailed('[compare] Sanity customizations batch fetch failed:', err);
    }
}

function getCachedCompareCustomizations(ids: string[]) {
    const key = ids.map((s) => s.trim().toLowerCase()).filter(Boolean).join(',');
    return sanityCache(
        () => fetchCompareCustomizations(ids),
        [`www-compare-customizations:${key}`],
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

    const ordered = await readThrough(
        () => fetchCompareCustomizations(ids),
        () => getCachedCompareCustomizations(ids),
    );
    return ordered.length ? customizationLibraryCompareData(ordered) : null;
}
