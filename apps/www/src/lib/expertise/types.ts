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
    metaTitle?: string;
    metaDescription?: string;
    allowIndex: boolean;
    allowFollow: boolean;
    noImageIndex: boolean;
    canonicalUrl?: string;
};
