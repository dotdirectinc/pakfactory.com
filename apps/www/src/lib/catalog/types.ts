export type ProductKind = 'standard' | 'inspiration';

/** Category slug from Sanity `customizationCategory.slug` (not a fixed union). */
export type CustomizationCategory = string;

export type CustomizationOption = {
    id: string;
    label: string;
    /** Sanity customizationCategory.slug */
    category: CustomizationCategory;
    categoryTitle?: string;
    /** @deprecated Prefer policy sortIndex via customization-category-policy. */
    categoryOrder?: number;
    categoryDescription?: string;
    typeId?: string;
    typeSlug?: string;
    typeTitle?: string;
    typeDescription?: string;
    /** Prefer customerSelects; kept as mirror for builder. */
    cardinality?: 'one' | 'many';
    customerSelects?: 'one' | 'many';
    slug?: string;
    shortDescription?: string;
    description?: string;
    imageUrl?: string | null;
    preselected?: boolean;
    /** Prefer configuratorRole. */
    role?: 'configurable' | 'reference';
    configuratorRole?: 'configurable' | 'reference';
    status?: string;
    /** Option/type ids this finishing/printing works on (empty = unrestricted). */
    worksOnIds?: string[];
    /** Option/type ids this cannot combine with. */
    incompatibleIds?: string[];
};

export type CatalogMedia = {
    src?: string;
    alt: string;
};

export type ProductLineRef = {
    slug: string;
    title: string;
};

export type ProductStyleRef = {
    slug: string;
    title: string;
    description?: string;
    shortDescription?: string;
    imageUrl?: string | null;
    imageAlt?: string;
};

export type ProductDimensionRange = {
    lengthMin?: number;
    lengthMax?: number;
    widthMin?: number;
    widthMax?: number;
    heightMin?: number;
    heightMax?: number;
    diameterMin?: number;
    diameterMax?: number;
    gussetMin?: number;
    gussetMax?: number;
    dropMin?: number;
    dropMax?: number;
    /** Legacy Studio depth → treated as height. */
    depthMin?: number;
    depthMax?: number;
};

export type ProductProperty = {
    label: string;
    value: string;
};

export type ProductFaq = {
    question: string;
    answerPlain: string;
};

export type TestimonialSource = 'google' | 'trustpilot';

export type ProductTestimonial = {
    quote: string;
    attributionName: string;
    rating: number;
    positives: string[];
    source: TestimonialSource;
};

export type TestimonialsAggregate = {
    source: 'google';
    label: string;
    score: number;
};

export type Product = {
    title: string;
    slug: string;
    sku: string;
    kind: ProductKind;
    media: CatalogMedia[];
    description: string;
    productLine: ProductLineRef;
    productStyle: ProductStyleRef;
    availableCustomizations: CustomizationOption[];
    primarySolution?: string;
    moq?: number;
    leadTimeDays?: number;
    /** Sanity dimensionInput shape key (rectangular, cylinder, …). */
    dimensionInput?: string;
    dimensionRange?: ProductDimensionRange;
    /** Spec rows from Sanity properties (PDP). */
    properties?: ProductProperty[];
    faqs?: ProductFaq[];
    relatedProducts?: Product[];
    /** Props-ready; empty until testimonial docs land (PROD-2293). */
    testimonials?: ProductTestimonial[];
};

export type ProductLine = {
    slug: string;
    title: string;
    description: string;
    imageUrl?: string | null;
    imageAlt?: string;
    styles: ProductStyleRef[];
    products: Product[];
};

export type ProductsSegmentResult =
    | {type: 'line'; line: ProductLine}
    | {type: 'product'; product: Product};

/** Facet option for the customizations library rail (PROD-1288). */
export type CustomizationFacetOption = {
    value: string;
    label: string;
};

export type CustomizationFacetDef = {
    /** `product-line` or Sanity `property.slug`. */
    id: string;
    title: string;
    options: CustomizationFacetOption[];
};

/** Enriched library card for faceted listing. */
export type CustomizationLibraryItem = {
    _id: string;
    title: string;
    slug: string;
    /** Sanity customizationCategory.slug */
    categoryValue: string;
    categoryLabel?: string;
    imageUrl?: string | null;
    imageAlt?: string | null;
    /** Full media list for card gallery (hero = images[0] / imageUrl). */
    images?: {src: string; alt?: string}[];
    // One-way from products that list this option in availableCustomizations.
    productLines: ProductLineRef[];
    /** property.slug → propertyValue.slug[] */
    attrs: Record<string, string[]>;
    /** property.slug → display title */
    propertyTitles: Record<string, string>;
    /** propertyValue.slug → display title */
    valueTitles: Record<string, string>;
};

export type CustomizationLibraryResult = {
    items: CustomizationLibraryItem[];
    tabs: {label: string; value: string}[];
    facetCatalog: {
        /** Always-on: Product Line + Sustainability (when present). */
        shared: CustomizationFacetDef[];
        /** Extra attribute facets keyed by category slug. */
        byCategory: Record<string, CustomizationFacetDef[]>;
    };
};

/** Stable facet id for Product Line (not a Sanity property). */
export const CUSTOMIZATION_PRODUCT_LINE_FACET_ID = 'product-line';

/** Same URL key as customizations — Product Line facet on `/products`. */
export const PRODUCT_CATALOG_PRODUCT_LINE_FACET_ID =
    CUSTOMIZATION_PRODUCT_LINE_FACET_ID;

/** Industries facet — Sanity `solution` with `solutionType == "industry"`. */
export const PRODUCT_CATALOG_INDUSTRY_FACET_ID = 'industry';

/** Enriched product card for the faceted `/products` library (PROD-1845). */
export type ProductLibraryItem = {
    _id: string;
    title: string;
    slug: string;
    sku: string;
    productLine: ProductLineRef;
    productStyle: ProductStyleRef;
    imageUrl?: string | null;
    imageAlt?: string | null;
    images?: {src: string; alt?: string}[];
    moq?: number;
    /** Industry solutions tagged on the product (`solutionType == "industry"`). */
    industries: {slug: string; title: string}[];
    /** property.slug → propertyValue.slug[] */
    attrs: Record<string, string[]>;
    propertyTitles: Record<string, string>;
    valueTitles: Record<string, string>;
};

/** Line meta for the catalog entry card (first spot when one line is filtered). */
export type ProductLibraryLineMeta = {
    slug: string;
    title: string;
    description?: string;
    imageUrl?: string | null;
    imageAlt?: string;
};

export type ProductLibraryResult = {
    items: ProductLibraryItem[];
    /** Unique product lines in the library, keyed by slug. */
    linesBySlug: Record<string, ProductLibraryLineMeta>;
    facetCatalog: {
        /** Always-on: Product Line + Industries + Sustainability (when present). */
        shared: CustomizationFacetDef[];
    };
};

/** Property value fact row for specs / configurator (PROD-1299). */
export type CustomizationPropertyFact = {
    label: string;
    display: string;
};

export type CustomizationPropertyValue = {
    id: string;
    title: string;
    slug: string;
    propertyId?: string;
    propertySlug?: string;
    propertyTitle?: string;
    valuesPerItem?: 'one' | 'many';
    imageUrl?: string | null;
    imageAlt?: string;
    facts: CustomizationPropertyFact[];
};

export type CustomizationDeclaredProperty = {
    usage: 'stated' | 'selectable';
    propertyId?: string;
    propertySlug?: string;
    propertyTitle?: string;
    valuesPerItem?: 'one' | 'many';
};

/** Full customization option detail (PROD-1299). */
export type CustomizationDetail = {
    id: string;
    title: string;
    slug: string;
    categoryValue: string;
    categoryLabel: string;
    typeTitle?: string;
    typeSlug?: string;
    /** Short copy for the identity column / meta. */
    description?: string;
    media: CatalogMedia[];
    properties: CustomizationPropertyValue[];
    declaredProperties: CustomizationDeclaredProperty[];
    productLines: ProductLineRef[];
    faqs?: ProductFaq[];
};

export type CustomizationDetailResult = {
    detail: CustomizationDetail;
    /** Same-category peers for comparison (Slice G); empty until wired. */
    peers: CustomizationDetail[];
};

