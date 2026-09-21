import {PRODUCT_CATALOG_INDUSTRY_FACET_ID} from '@/lib/catalog/types';
import type {
    SolutionInspirationsContent,
    SolutionLogosContent,
    SolutionPage,
} from '@/lib/solutions/types';
import {WWW_ROUTES} from '@/lib/www-routes';

export const BEAUTY_COSMETICS_SLUG = 'beauty-cosmetics';

const LOGO_DIR = '/solutions/beauty-cosmetics/logos';
const HERO_DIR = '/solutions/beauty-cosmetics/hero';

export function isBeautyCosmeticsSlug(slug: string): boolean {
    return slug.trim().toLowerCase() === BEAUTY_COSMETICS_SLUG;
}

/**
 * Minimal SolutionPage when Sanity has no hasPage doc for Beauty yet.
 * Hero bands are built via `buildSolutionHeroContent` (mock gallery).
 */
export const beautyCosmeticsSolutionPage: SolutionPage = {
    title: 'Beauty & Cosmetics',
    h1: 'Custom beauty packaging',
    shortName: 'Beauty',
    slug: BEAUTY_COSMETICS_SLUG,
    shortDescription:
        'Packaging paths, inspiration, and expertise for beauty and cosmetics brands.',
    description: [],
    descriptionText:
        'From rigid boxes to folding cartons — packaging built for beauty brands that need shelf impact and production-ready specs.',
    featuredImageUrl: null,
    featuredImageAlt: 'Beauty & Cosmetics',
    packagingFormats: [],
    relatedProducts: [],
    relatedCaseStudies: [],
    relatedSolutions: [],
    metaTitle: 'Beauty & Cosmetics Packaging Solutions | PakFactory',
    metaDescription:
        'Explore custom packaging for beauty and cosmetics — inspiration, finishes, expertise, and a path to a quote.',
    allowIndex: true,
    allowFollow: true,
    noImageIndex: false,
};

/**
 * Fork 3 logo band fixture (Figma logo-cloud + POC mark sizes).
 * Only Venture links — verified case study on pakfactory.com.
 */
export const beautyCosmeticsLogos: SolutionLogosContent = {
    heading: 'Brands we build beauty packaging for',
    subhead:
        'Building beauty & cosmetic packaging with confidence and speed.',
    items: [
        {
            id: 'venture',
            name: 'Venture',
            imageSrc: `${LOGO_DIR}/venture.png`,
            href: `${WWW_ROUTES.caseStudies}/venture`,
            linkLabel:
                "Case study: Launching Venture's Oasis Collection as One Cohesive Retail Set",
            width: 127,
            height: 71,
        },
        {
            id: 'innisfree',
            name: 'innisfree',
            imageSrc: `${LOGO_DIR}/innisfree.png`,
            width: 159,
            height: 26,
        },
        {
            id: 'drop',
            name: 'drop',
            imageSrc: `${LOGO_DIR}/drop.png`,
            width: 127,
            height: 71,
        },
        {
            id: 'revlon',
            name: 'Revlon',
            imageSrc: `${LOGO_DIR}/revlon.png`,
            width: 142,
            height: 24,
        },
        {
            id: 'ammu-beauty',
            name: 'Ammu Beauty',
            imageSrc: `${LOGO_DIR}/ammu-beauty.png`,
            width: 127,
            height: 72,
        },
        {
            id: 'benefit',
            name: 'Benefit',
            imageSrc: `${LOGO_DIR}/benefit.png`,
            width: 170,
            height: 60,
        },
    ],
};

/**
 * Fork 4 inspirations band (Figma inspiration-entry-section + POC V3 copy).
 * Card hrefs are placeholders until solution line collections exist.
 */
export const beautyCosmeticsInspirations: SolutionInspirationsContent = {
    eyebrow: 'Inspirations',
    headline:
        'Explore every format a beauty line needs. Produced, not rendered.',
    highlightSpans: ['a beauty line needs.'],
    description:
        '737 packaging across skincare, makeup, fragrance, hair and gifting. Filter by what you are packing.',
    cta: {
        label: 'Browse all inspirations',
        href: `${WWW_ROUTES.products}?${PRODUCT_CATALOG_INDUSTRY_FACET_ID}=${BEAUTY_COSMETICS_SLUG}`,
    },
    cards: [
        {
            id: 'paper-gift-bags',
            title: 'Paper Gift Bags',
            description:
                'Elevate beauty shopping experiences with our chic cosmetic paper gift bags.',
            image: {
                src: `${HERO_DIR}/tile-novus-edge.png`,
                alt: 'Pink rigid gift box holding six pastel lip balm pods',
            },
            href: '#',
        },
        {
            id: 'beauty-pouches',
            title: 'Beauty Pouches',
            description:
                'Package cosmetic products and accessories in our fully customizable pouches.',
            image: {
                src: `${HERO_DIR}/tile-myko.png`,
                alt: 'Printed stand-up pouch with a silver foil interior',
            },
            href: '#',
        },
        {
            id: 'product-boxes',
            title: 'Product Boxes',
            description:
                'Enhance shelf appeal with our custom cosmetic boxes that provide premium branding and reliable protection.',
            image: {
                src: `${HERO_DIR}/tile-product-boxes.png`,
                alt: 'Blue Drop body scrub jar in an open printed shipper',
            },
            href: '#',
        },
        {
            id: 'shipping-boxes',
            title: 'Shipping Boxes',
            description:
                'Deliver beauty with our cosmetic and skincare shipping boxes, offering excellent protection and effective branding.',
            image: {
                src: `${HERO_DIR}/tile-novus-edge-1.png`,
                alt: 'Six pastel folding cartons stacked into a column',
            },
            href: '#',
        },
        {
            id: 'premium-rigid-gift-boxes',
            title: 'Premium Rigid Gift Boxes',
            description:
                'Enhance beauty brand prestige with our luxury cosmetic packaging boxes, expertly crafted for superior protection elegance.',
            image: {
                src: `${HERO_DIR}/tile-caudalie.png`,
                alt: 'Jumiso skincare set in a frosted window carton',
            },
            href: '#',
        },
        {
            id: 'labels-stickers',
            title: 'Labels & Stickers',
            description:
                'Enhance beauty packaging with customizable cosmetic labels and stickers, offering stunning designs durability.',
            image: {
                src: `${HERO_DIR}/tile-meridian.png`,
                alt: 'Acure treatment tube beside a holographic printed carton',
            },
            href: '#',
        },
    ],
};
