import type {PortableTextBlock} from '@portabletext/types';
import type {Product} from '@/lib/catalog/types';

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
    heroImageUrl: string | null;
    heroImageAlt: string;
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
