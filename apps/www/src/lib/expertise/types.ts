import type {PageSectionDoc} from '@pakfactory/sanity/queries';

export type ExpertiseStageCard = {
    slug: string;
    title: string;
    description?: string;
    imageUrl?: string | null;
    imageAlt?: string;
    status?: string;
};

export type ExpertiseStagePage = {
    slug: string;
    title: string;
    h1: string;
    tagline?: string;
    description?: string;
    status?: string;
    diagramUrl?: string | null;
    diagramAlt?: string;
    /** Hero primary button label; empty → site-wide quote label. */
    heroCtaLabel?: string;
    /** Hero in-page link — label + the section `_type` it jumps to. */
    heroSecondary?: {label: string; target: string};
    /** Full-width picture under the hero (none → the page opens on its body). */
    heroImageUrl?: string;
    heroImageAlt?: string;
    /** Resolved body sections (host inherit + page-field tokens applied). */
    sections: PageSectionDoc[];
    ogTitle?: string;
    ogDescription?: string;
    ogImageUrl?: string;
    metaTitle?: string;
    metaDescription?: string;
    allowIndex: boolean;
    allowFollow: boolean;
    noImageIndex: boolean;
    canonicalUrl?: string;
};
