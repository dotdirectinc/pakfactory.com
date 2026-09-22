import type {PortableTextBlock} from '@portabletext/types';
import type {CaseStudiesRowContent} from '@/components/sections/case-studies-row';
import type {VideoCaseStudiesRowContent} from '@/components/sections/video-case-studies-row';
import type {
    Product,
    ProductFaq,
    ProductTestimonial,
    TestimonialsAggregate,
} from '@/lib/catalog/types';

export type {CaseStudiesRowContent, VideoCaseStudiesRowContent};

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

/** Shared link shape for CTAs across landing bands (Fork 0 → Sanity later). */
export type SolutionCta = {
    label: string;
    href: string;
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

export type SolutionLogosContent = {
    /** Document outline / screen readers; not shown visibly. */
    heading?: string;
    /** Muted band lead under the hero. */
    subhead?: string;
    items: SolutionLogoItem[];
};

export type SolutionInspirationCard = {
    id: string;
    title: string;
    description?: string;
    image: SolutionMedia;
    href: string;
    countLabel?: string;
};

export type SolutionInspirationsContent = {
    eyebrow: string;
    headline: string;
    /** Substrings within `headline` that receive the highlight wipe. */
    highlightSpans?: string[];
    /** Band lead under the headline (POC/Figma description). */
    description?: string;
    cta?: SolutionCta;
    cards: SolutionInspirationCard[];
};

export type SolutionCustomizationsContent = {
    eyebrow: string;
    headline: string;
    highlightSpans?: string[];
    body?: string;
    image: SolutionMedia;
    cta: SolutionCta;
};

export type SolutionExpertiseStage = {
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

export type SolutionExpertiseManager = {
    name: string;
    role?: string;
    blurb?: string;
    avatar?: SolutionMedia | null;
};

export type SolutionExpertiseContent = {
    eyebrow: string;
    headline: string;
    highlightSpans?: string[];
    /** Band lead under the headline. */
    description?: string;
    cta?: SolutionCta;
    journeyLabels: string[];
    stages: SolutionExpertiseStage[];
    manager?: SolutionExpertiseManager | null;
};

/** Props for TestimonialsRow on the Industry Solution LP (Fork 8). */
export type SolutionTestimonialsContent = {
    items: ProductTestimonial[];
    aggregate?: TestimonialsAggregate;
    title?: string;
    description?: string;
};

/** Props for FaqSection on the Industry Solution LP (Fork 9). */
export type SolutionFaqsContent = {
    items: ProductFaq[];
    heading?: string;
    description?: string;
    footerHref?: string;
    footerLabel?: string;
};

/**
 * Full Industry Solution LP payload (PROD-1541).
 * Section UIs land in later forks; Fork 0 defines the contract + fixtures.
 * Optional bands may be null until content/UI exists.
 * `caseStudies` uses the Sanity-ready CaseStudiesRow content shape.
 * `videoCaseStudies` is the Webflow-style portrait band under expand.
 * `testimonials` / `faqs` match existing PDP section props.
 */
export type SolutionLandingContent = {
    solution: SolutionPage;
    hero: SolutionHeroContent | null;
    logos: SolutionLogosContent | null;
    inspirations: SolutionInspirationsContent | null;
    customizations: SolutionCustomizationsContent | null;
    expertise: SolutionExpertiseContent | null;
    caseStudies: CaseStudiesRowContent | null;
    videoCaseStudies: VideoCaseStudiesRowContent | null;
    testimonials: SolutionTestimonialsContent | null;
    faqs: SolutionFaqsContent | null;
};
