import type {CatalogRulesProductDoc} from '@pakfactory/sanity/queries';
import type {PreparedRules} from '@/lib/catalog/customization-rules';

/** One product's resolved customization offer for compatibility matching (PROD-2921). */
export type ProductOfferIndexEntry = {
    productId: string;
    slug: string;
    kind: string | null;
    baseOfferIds: ReadonlySet<string>;
    rulesProduct: CatalogRulesProductDoc | null;
};

export type ProductOfferIndex = {
    entries: ProductOfferIndexEntry[];
    /** True when `prepareRules` returned a catalog (conflict checks are available). */
    hasRules: boolean;
    rules: PreparedRules | null;
};
