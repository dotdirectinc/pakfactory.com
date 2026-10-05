import type {PageSectionDoc} from '@pakfactory/sanity/queries';
import type {PortableTextBlock} from '@portabletext/types';
import type {CustomizationRulesSnapshot} from '@/lib/catalog/customization-rules';

export type ProductKind = 'standard' | 'inspiration';

/** Category slug from Sanity `customizationCategory.slug` (not a fixed union). */
export type CustomizationCategory = string;

/** Technical option that can deliver this customer-facing option (PROD-2629). */
export type AchievedByOption = {
    id: string;
    title: string;
    slug?: string;
    typeTitle?: string;
    categorySlug?: string;
    description?: string;
    imageUrl?: string | null;
    hasPage?: boolean;
};

/**
 * Where a customization option meets a customer (PROD-2732). Replaces the
 * `configuratorRole` + `hasPage` pair.
 *
 * 🔴 Both predicates test for the values they WANT. An option with no `appearsIn`
 * — not yet backfilled, or written over the API — must read as neither pickable
 * nor page-bearing, so a missing value hides it instead of leaking it.
 */
export type AppearsIn =
    | 'configurable-with-page'
    | 'not-configurable-with-page'
    | 'configurable-no-page';

/** Does a customer pick this option in the configurator? */
export function isConfigurable(appearsIn: string | null | undefined): boolean {
    return (
        appearsIn === 'configurable-with-page' ||
        appearsIn === 'configurable-no-page'
    );
}

/** Does this option have its own detail page in the customization library? */
export function hasDetailPage(appearsIn: string | null | undefined): boolean {
    return (
        appearsIn === 'configurable-with-page' ||
        appearsIn === 'not-configurable-with-page'
    );
}

export type CustomizationOption = {
    id: string;
    label: string;
    /** Sanity customizationCategory.slug */
    category: CustomizationCategory;
    categoryTitle?: string;
    categoryDescription?: string;
    /**
     * Curated type ids for this option's category (PROD-2740 / PROD-2746).
     * Pass to `orderTypesInCategory` — order only, never a gate.
     */
    categoryTypeOrder?: string[];
    /**
     * Curated option ids for this option's type (PROD-2748 / PROD-2775).
     * Pass to `orderOptionsInType` — order only, never a gate.
     */
    typeOptionOrder?: string[];
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
    /** PROD-2732 — replaces `role` + `configuratorRole`. Absent on an un-backfilled document. */
    appearsIn?: AppearsIn;
    status?: string;
    /** Reverse of Sanity `achieves` — candidates, not a recipe (ADR-017). */
    achievedBy?: AchievedByOption[];
};

/**
 * Lifecycle of a product or customization with a page (Richard's baseline, 2026-09-28):
 * active = normal; coming-soon = page says coming soon, listed with a badge, not orderable;
 * discontinued = page says no longer available, not listed, not orderable. Unset reads active.
 */
export type CatalogLifecycle = 'active' | 'coming-soon' | 'discontinued';

export function toLifecycle(status: string | null | undefined): CatalogLifecycle {
    return status === 'coming-soon' || status === 'discontinued' ? status : 'active';
}

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
    /** The style's own FAQs. Empty → the style page uses its line's (see `resolveStyleFaqs`). */
    faqs?: ProductFaq[];
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
    /** Portable Text blocks when available; render these for bold/links. */
    answer?: PortableTextBlock[];
};

export type TestimonialSource = 'google' | 'trustpilot';

export type ProductTestimonial = {
    quote: string;
    attributionName: string;
    rating: number;
    /** Optional — Google reviews have no “positives” tags. */
    positives?: string[];
    source: TestimonialSource;
    avatarUrl?: string;
    /** Author profile URL (Google attribution). */
    authorProfileUrl?: string;
    /** Individual review URL on Google Maps (Read more target). */
    reviewUrl?: string;
};

export type TestimonialsAggregate = {
    source: 'google';
    label: string;
    score: number;
    /** Google place-level total review count (not filtered subset). */
    reviewCount?: number;
};

/** Live Google Reviews band payload (Places interim; GBP later). */
export type GoogleReviewsBand = {
    items: ProductTestimonial[];
    aggregate?: TestimonialsAggregate;
    /** Place-level Google Maps reviews profile (View all reviews). */
    reviewsProfileUrl?: string;
};

export type Product = {
    /** Lifecycle — drives the PDP notice and whether it can be added to a request. */
    status?: CatalogLifecycle;
    title: string;
    slug: string;
    sku: string;
    kind: ProductKind;
    /**
     * PDP gallery slides: Media extras first, Featured image last when set
     * (deduped by URL). Index 0 is the default main well.
     */
    media: CatalogMedia[];
    /**
     * Hover-play video URL from Sanity `featuredVideo` (product-line hero marquee).
     */
    featuredVideoUrl?: string | null;
    /**
     * Public GLB URL from Sanity `model3d.url`. Plain URL contract for preview
     * modals — PakStudio may supply this later without the CMS field.
     */
    model3dUrl?: string | null;
    /** Optional glTF animation clip name for Open/Close in the 3D viewer. */
    model3dAnimationName?: string | null;
    description: string;
    productLine: ProductLineRef;
    productStyle: ProductStyleRef;
    availableCustomizations: CustomizationOption[];
    /**
     * The rules this product's options were resolved with (PROD-2556), for the builder to
     * narrow on as the customer chooses. Absent when the dataset has no rules yet.
     */
    customizationRules?: CustomizationRulesSnapshot;
    primarySolution?: string;
    /**
     * Inspiration PDP breadcrumb parent — first industry solution, else solutions[0].
     */
    breadcrumbParent?: {title: string; slug: string};
    /**
     * All industry solutions tagged on the product (line Inspiration band).
     * Absent on lean card projections that only return breadcrumbParent.
     */
    industries?: {title: string; slug: string}[];
    /**
     * First matching Solution Style under `breadcrumbParent` (PROD-2763).
     * Absent when no style filter matches.
     */
    breadcrumbStyle?: {title: string; slug: string};
    moq?: number;
    /** Sanity dimensionInput shape key (rectangular, cylinder, …). */
    dimensionInput?: string;
    dimensionRange?: ProductDimensionRange;
    /** Spec rows from Sanity properties (PDP). */
    properties?: ProductProperty[];
    faqs?: ProductFaq[];
    relatedProducts?: Product[];
    /** Props-ready; empty until testimonial docs land (PROD-2293). */
    testimonials?: ProductTestimonial[];
    /**
     * Page-builder sections on this product (content). Merged with
     * `templateSections` for the PDP lower body.
     */
    sections?: PageSectionDoc[];
    templateSections?: PageSectionDoc[];
};

export type ProductLineExpertiseRef = {
    slug: string;
    title: string;
    description?: string;
    imageUrl?: string | null;
    imageAlt?: string;
};

export type ProductLineCaseStudyRef = {
    slug: string;
    title: string;
    cardSummary?: string;
    imageUrl?: string | null;
    imageAlt?: string;
};

export type ProductLineRelatedRef = {
    slug: string;
    title: string;
    shortDescription?: string;
    imageUrl?: string | null;
    imageAlt?: string;
};

export type ProductLineFrame = {
    src: string;
    alt: string;
};

export type ProductLine = {
    slug: string;
    title: string;
    description: string;
    /** Page H1 override; empty falls back to title in the landing assembler. */
    h1?: string;
    /** Card/nav label; empty falls back to title for section tokens. */
    shortName?: string;
    shortDescription?: string;
    metaTitle?: string;
    metaDescription?: string;
    imageUrl?: string | null;
    imageAlt?: string;
    /**
     * Featured hero video URL from Sanity `featuredVideo`. Used for bottomBar
     * marquee hover-play; stack shows a static featured image.
     */
    featuredVideoUrl?: string | null;
    /**
     * Landing hero chrome from the selected Product Line Page layout.
     * `stack` (default) = featured icon + copy above media;
     * `bottomBar` = media-first with icon/copy/CTAs along the bottom.
     */
    heroLayout?: 'stack' | 'bottomBar';
    /** Featured icon on the landing hero (Sanity field `kitMark`). */
    featuredIconUrl?: string | null;
    featuredIconAlt?: string;
    /** Ordered hero frames from Sanity `media` (featured image is separate). */
    frames?: ProductLineFrame[];
    expertise?: ProductLineExpertiseRef[];
    featuredStudies?: ProductLineCaseStudyRef[];
    /** Pinned hero products (Categorization); prepended before auto line products. */
    featuredProducts?: Product[];
    /**
     * Inspiration-kind products for this line (Inspiration section).
     * Separate from `products` (standard-only hero / styles).
     */
    inspirationProducts?: Product[];
    relatedLines?: ProductLineRelatedRef[];
    faqs?: ProductFaq[];
    /**
     * Page-builder sections on this line (content). Merged with
     * `templateSections` for the landing body.
     */
    sections?: PageSectionDoc[];
    /** Sections from the selected Product Line Page template (order/chrome). */
    templateSections?: PageSectionDoc[];
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
    /**
     * Rest thumb = Featured image else first Media (ADR-023 card rules).
     * Prefer `featuredImageUrl` / `mediaImages` for hover logic.
     */
    imageUrl?: string | null;
    imageAlt?: string | null;
    /** Featured image URL when set (role-named still). */
    featuredImageUrl?: string | null;
    featuredImageAlt?: string | null;
    /** Sanity `media` frames only — not Featured (hover may use [1]). */
    mediaImages?: {src: string; alt?: string}[];
    /** Playable Featured video URL; YouTube yields null. */
    featuredVideoUrl?: string | null;
    /**
     * @deprecated Prefer featuredImageUrl + mediaImages for card hover.
     * Kept as rest-thumb alias for quick view / older callers.
     */
    images?: {src: string; alt?: string}[];
    // One-way from products that list this option in availableCustomizations.
    productLines: ProductLineRef[];
    /** property.slug → propertyValue.slug[] */
    attrs: Record<string, string[]>;
    /** property.slug → display title */
    propertyTitles: Record<string, string>;
    /** propertyValue.slug → display title */
    valueTitles: Record<string, string>;
    status?: CatalogLifecycle;
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

/** Product type facet — Sanity `product.kind` (`standard` | `inspiration`). */
export const PRODUCT_CATALOG_PRODUCT_TYPE_FACET_ID = 'product-type';

/**
 * Product Style facet — nested under a single selected Product Line on `/products`.
 * Not a top-level rail accordion.
 */
export const PRODUCT_CATALOG_PRODUCT_STYLE_FACET_ID = 'product-style';

/**
 * Library card style — slug + title only (PROD-2599). Full style copy stays on
 * landing / PDP projections.
 */
export type ProductLibraryStyleRef = {
    slug: string;
    title: string;
};

/** Enriched product card for the faceted `/products` library (PROD-1845). */
export type ProductLibraryItem = {
    _id: string;
    title: string;
    slug: string;
    sku: string;
    /** Sanity `product.kind` — drives the Product type facet. */
    kind: ProductKind;
    productLine: ProductLineRef;
    productStyle: ProductLibraryStyleRef;
    imageUrl?: string | null;
    imageAlt?: string | null;
    images?: {src: string; alt?: string}[];
    moq?: number;
    status?: CatalogLifecycle;
    /** Industry solutions tagged on the product (`solutionType == "industry"`). */
    industries: {slug: string; title: string}[];
    /** property.slug → propertyValue.slug[] */
    attrs: Record<string, string[]>;
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
    /** Styles per line for the nested Product Style filter (keyed by line slug). */
    stylesByLineSlug: Record<string, CustomizationFacetOption[]>;
    /** property.slug → display title (hoisted off per-item copies). */
    propertyTitles: Record<string, string>;
    facetCatalog: {
        /** Always-on: Product type + Product Line + Industries + Sustainability (when present). */
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
    /**
     * Stated rows only (Studio showOnDetailPage, PROD-2610). `false` = a hidden fact: it still
     * filters listings, but Specs & performance and the compare matrix do not print it. Absent =
     * shown, as Studio defaults it.
     */
    showOnDetailPage?: false;
    propertyId?: string;
    propertySlug?: string;
    propertyTitle?: string;
    valuesPerItem?: 'one' | 'many';
};

/** “See it in use” tile — solution (large), case study (small), or option media fallback. */
export type CustomizationShowcaseTile = {
    kind: 'solution' | 'caseStudy' | 'media';
    src: string;
    alt: string;
    title: string;
    description?: string;
    href?: string;
    linkLabel?: string;
};

/** Full customization option detail (PROD-1299). */
export type CustomizationDetail = {
    id: string;
    title: string;
    /** Coming soon / discontinued show a badge and a notice (PROD-2605). */
    status?: CatalogLifecycle;
    slug: string;
    categoryValue: string;
    categoryLabel: string;
    typeTitle?: string;
    typeSlug?: string;
    /**
     * Plain text from linked glossary definition (PROD-2779).
     * On-page hero prefers `glossaryDefinition` PT; this is for SEO fallbacks.
     * Empty when no glossary term is linked — do not fill from shortDescription.
     */
    description?: string;
    /**
     * Linked glossaryTerm.definition portable text for the CDP hero (PROD-2779).
     * When absent, hero description stays empty so missing content is obvious.
     */
    glossaryDefinition?: PortableTextBlock[];
    /** SEO meta description only — use in generateMetadata, never on-page body. */
    metaDescription?: string;
    /** Studio `benefits.title` — Overview heading. */
    benefitsTitle?: string;
    /** Studio `benefits.body` portable text — Overview body. */
    benefitsBody?: PortableTextBlock[];
    /**
     * Gallery slides: Featured image first (when set), then Media extras (ADR-023).
     * Index 0 is the poster for Featured video hover.
     */
    media: CatalogMedia[];
    /** Playable MP4/MOV from Studio Featured video; YouTube yields null. */
    featuredVideoUrl?: string | null;
    /** Optional Specs PDF — when set, config rail shows Download spec sheet. */
    specSheetUrl?: string | null;
    /**
     * Large “See it in use” tiles — solutions via products (else option media fallback).
     * Cap 3. Empty + empty case studies → hide showcase section.
     */
    showcaseSolutions: CustomizationShowcaseTile[];
    /**
     * Small “See it in use” tiles — case studies that tag this option.
     * Cap 5 so promotions can fill large slots; bento uses at most 2 as small.
     */
    showcaseCaseStudies: CustomizationShowcaseTile[];
    properties: CustomizationPropertyValue[];
    declaredProperties: CustomizationDeclaredProperty[];
    productLines: ProductLineRef[];
    faqs?: ProductFaq[];
};

export type CustomizationDetailResult = {
    detail: CustomizationDetail;
    /** Same-category library peers for the detail compare band (PROD-1534). */
    peers: CustomizationDetail[];
};

