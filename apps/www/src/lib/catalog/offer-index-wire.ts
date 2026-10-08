/**
 * RSC ↔ client wire for {@link ProductOfferIndex} (PROD-2921).
 * `Set` / `Map` are not JSON-safe across the boundary.
 */

import type {CatalogRulesProductDoc} from '@pakfactory/sanity/queries';
import type {
    CatalogWithDependencies,
    DependencyGraphResult,
} from '@pakfactory/sanity/customization-rules/dependencies';

import type {PreparedRules} from '@/lib/catalog/customization-rules';
import type {
    ProductOfferIndex,
    ProductOfferIndexEntry,
} from '@/lib/catalog/product-offer-index';

export type PackedProductOfferIndexEntry = {
    productId: string;
    slug: string;
    kind: string | null;
    baseOfferIds: string[];
    rulesProduct: CatalogRulesProductDoc | null;
};

export type PackedPreparedRules = {
    catalog: CatalogWithDependencies;
    graph: DependencyGraphResult;
    /** option id → type id (enough for compatibility resolve). */
    optionTypeById: Record<string, string>;
};

export type PackedProductOfferIndex = {
    entries: PackedProductOfferIndexEntry[];
    hasRules: boolean;
    rules: PackedPreparedRules | null;
};

export function packOfferIndex(index: ProductOfferIndex): PackedProductOfferIndex {
    const rules: PackedPreparedRules | null = index.rules
        ? {
              catalog: index.rules.catalog,
              graph: index.rules.graph,
              optionTypeById: Object.fromEntries(
                  [...index.rules.optionDocs.entries()].map(([id, doc]) => [
                      id,
                      doc.typeId?.trim() || '',
                  ]),
              ),
          }
        : null;

    return {
        entries: index.entries.map((entry) => ({
            productId: entry.productId,
            slug: entry.slug,
            kind: entry.kind,
            baseOfferIds: [...entry.baseOfferIds],
            rulesProduct: entry.rulesProduct,
        })),
        hasRules: index.hasRules,
        rules,
    };
}

export function unpackOfferIndex(
    packed: PackedProductOfferIndex,
): ProductOfferIndex {
    let rules: PreparedRules | null = null;
    if (packed.rules) {
        const optionDocs = new Map<
            string,
            { _id: string; typeId: string }
        >();
        for (const [id, typeId] of Object.entries(
            packed.rules.optionTypeById,
        )) {
            if (!typeId) continue;
            optionDocs.set(id, {_id: id, typeId});
        }
        rules = {
            catalog: packed.rules.catalog,
            graph: packed.rules.graph,
            optionDocs: optionDocs as PreparedRules['optionDocs'],
        };
    }

    const entries: ProductOfferIndexEntry[] = packed.entries.map((entry) => ({
        productId: entry.productId,
        slug: entry.slug,
        kind: entry.kind,
        baseOfferIds: new Set(entry.baseOfferIds),
        rulesProduct: entry.rulesProduct,
    }));

    return {
        entries,
        hasRules: packed.hasRules,
        rules,
    };
}
