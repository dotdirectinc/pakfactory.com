import type {PortableTextBlock} from '@portabletext/types';
import type {PageSectionDoc} from '@pakfactory/sanity/queries';
import type {
    Product,
    ProductLibraryResult,
} from '@/lib/catalog/types';

/** Sanity page section doc (www SectionRenderer). */
export type PageSection = PageSectionDoc;

export type SolutionCard = {
    slug: string;
    title: string;
    description?: string;
    imageUrl?: string | null;
    imageAlt?: string;
};

export type SolutionRelatedLink = {
    title: string;
    slug: string;
};

export type SolutionFormat = {
    title: string;
    slug: string;
    description?: string;
    imageUrl?: string | null;
    imageAlt?: string;
};

export type SolutionPage = {
    title: string;
    h1: string;
    shortName: string;
    slug: string;
    shortDescription: string;
    description: PortableTextBlock[];
    /** Plain text from Sanity `description` (pt::text) for hero subtitle. */
    descriptionText: string;
    featuredImageUrl: string | null;
    featuredImageAlt: string;
    packagingFormats: SolutionFormat[];
    relatedProducts: Product[];
    relatedCaseStudies: SolutionRelatedLink[];
    relatedSolutions: SolutionRelatedLink[];
    metaTitle?: string;
    metaDescription?: string;
    allowIndex: boolean;
    allowFollow: boolean;
    noImageIndex: boolean;
    canonicalUrl?: string;
};

export type SolutionLineCatalog = {
    solution: SolutionPage;
    line: SolutionFormat;
    products: Product[];
};

export type SolutionStyleCard = {
    slug: string;
    title: string;
    description?: string;
    imageUrl?: string | null;
    imageAlt?: string;
};

export type SolutionStylePage = {
    slug: string;
    title: string;
    h1: string;
    shortName: string;
    shortDescription: string;
    descriptionText: string;
    featuredImageUrl: string | null;
    featuredImageAlt: string;
    metaTitle?: string;
    metaDescription?: string;
    allowIndex: boolean;
    allowFollow: boolean;
    noImageIndex: boolean;
    canonicalUrl?: string;
};

export type SolutionStyleCatalog = {
    solution: {
        slug: string;
        title: string;
        shortName: string;
        allowIndex: boolean;
        allowFollow: boolean;
    };
    style: SolutionStylePage;
    library: ProductLibraryResult;
};

/** Shared link shape for CTAs across landing bands (Fork 0 → Sanity later). */
export type SolutionCta = {
    label: string;
    href: string;
};

/** Optional band chrome from Sanity sectionHeaderFields (eyebrow · align · paddingBlock · dieline borders). */
export type SectionBandChrome = {
    align?: 'left' | 'center';
    borderTop?: boolean;
    borderBottom?: boolean;
    /** PageDielineSection vertical rhythm. Default md when unset. */
    paddingBlock?: 'xs' | 'sm' | 'md' | 'lg';
};

export type SolutionMedia = {
    src: string;
    alt: string;
};

export type SolutionHeroTile = {
    id: string;
    /** Optional; empty carousel tiles omit image. */
    image?: SolutionMedia | null;
    label?: string;
    /** Desktop width in px for masonry/carousel; height is uniform. */
    width?: number;
    /** Preview dialog payload (CMS product). */
    title?: string;
    detailHref?: string;
    customizations?: SolutionHeroCustomization[];
};

export type SolutionHeroCustomization = {
    id: string;
    category: string;
    title: string;
    description: string;
    learnMoreHref: string;
};

export type SolutionHeroContent = {
    /** Static leading segment / full H1 when rotatingWords empty. */
    h1Lead?: string;
    /** Static trailing segment after the keyword, e.g. "packaging". */
    h1Trail?: string;
    /**
     * Keyword options for the H1. Empty = render h1Lead alone (Sanity H1).
     */
    rotatingWords: string[];
    subtitle: string;
    cta: SolutionCta;
    secondaryCta?: SolutionCta;
    kitMark?: SolutionMedia | null;
    tiles: SolutionHeroTile[];
};

export type SolutionLogoItem = {
    id: string;
    name: string;
    imageSrc: string;
    href?: string;
    /** Accessible name when `href` is set (e.g. case study title). */
    linkLabel?: string;
    width?: number;
    height?: number;
};

export type SolutionLogosContent = SectionBandChrome & {
    /** Document outline / screen readers; not shown visibly. */
    heading?: string;
    /** Muted band lead under the hero. */
    subhead?: string;
    /** Optional section CTA (from Studio section link). */
    cta?: SolutionCta;
    items: SolutionLogoItem[];
};

export type InspirationGalleryCard = {
    id: string;
    title: string;
    description?: string;
    image: SolutionMedia;
    href: string;
    countLabel?: string;
};

export type InspirationGalleryContent = SectionBandChrome & {
    eyebrow?: string;
    headline: string;
    /** Substrings within `headline` that receive the highlight wipe. */
    highlightSpans?: string[];
    /** Band lead under the headline (POC/Figma description). */
    description?: string;
    cta?: SolutionCta;
    cards: InspirationGalleryCard[];
};

/** @deprecated Use InspirationGalleryContent (ADR-020). */
export type SolutionInspirationsContent = InspirationGalleryContent;
/** @deprecated Use InspirationGalleryCard (ADR-020). */
export type SolutionInspirationCard = InspirationGalleryCard;

export type SolutionCustomizationsContent = {
    eyebrow: string;
    headline: string;
    highlightSpans?: string[];
    body?: string;
    image: SolutionMedia;
    cta: SolutionCta;
};

export type ExpertiseRowStage = {
    id: string;
    /** Pill label (e.g. "Design"). */
    title: string;
    /** Open-card lead line under the title. */
    headline?: string;
    body?: string;
    /** Optional chips inside the open card. */
    points?: string[];
    cta?: SolutionCta;
    media?: SolutionMedia | null;
    /** Dashed MediaSlot label when `media` is missing. */
    mediaPlaceholder?: string;
};

export type ExpertiseRowManager = {
    name: string;
    role?: string;
    blurb?: string;
    avatar?: SolutionMedia | null;
};

export type ExpertiseRowContent = SectionBandChrome & {
    eyebrow?: string;
    headline: string;
    highlightSpans?: string[];
    /** Band lead under the headline. */
    description?: string;
    cta?: SolutionCta;
    journeyLabels?: string[];
    stages: ExpertiseRowStage[];
    manager?: ExpertiseRowManager | null;
};

/** @deprecated Use ExpertiseRowContent (ADR-020). */
export type SolutionExpertiseContent = ExpertiseRowContent;
/** @deprecated Use ExpertiseRowStage (ADR-020). */
export type SolutionExpertiseStage = ExpertiseRowStage;
/** @deprecated Use ExpertiseRowManager (ADR-020). */
export type SolutionExpertiseManager = ExpertiseRowManager;

/**
 * Full Industry Solution LP payload.
 * Route-owned hero + CMS body via `sections` (merged template × content).
 */
export type SolutionLandingContent = {
    solution: SolutionPage;
    hero: SolutionHeroContent | null;
    /** Merged template + solution sections for SectionRenderer. */
    sections: PageSection[] | null;
};
