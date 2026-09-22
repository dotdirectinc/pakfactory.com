import type {CaseStudiesRowContent} from '@/components/sections/case-studies-row';
import type {VideoCaseStudiesRowContent} from '@/components/sections/video-case-studies-row';
import {PRODUCT_CATALOG_INDUSTRY_FACET_ID} from '@/lib/catalog/types';
import {
    MOCK_PRODUCT_TESTIMONIALS,
    MOCK_TESTIMONIALS_AGGREGATE,
} from '@/lib/catalog/mock-testimonials';
import type {
    SolutionCustomizationsContent,
    SolutionExpertiseContent,
    SolutionFaqsContent,
    SolutionInspirationsContent,
    SolutionLogosContent,
    SolutionPage,
    SolutionTestimonialsContent,
} from '@/lib/solutions/types';
import {WWW_ROUTES} from '@/lib/www-routes';

export const BEAUTY_COSMETICS_SLUG = 'beauty-cosmetics';

const LOGO_DIR = '/solutions/beauty-cosmetics/logos';
const HERO_DIR = '/solutions/beauty-cosmetics/hero';
const CUSTOMIZATIONS_DIR = '/solutions/beauty-cosmetics/customizations';
const EXPERTISE_DIR = '/solutions/beauty-cosmetics/expertise';
const CASE_STUDIES_DIR = '/solutions/beauty-cosmetics/case-studies';

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

/**
 * Fork 5 customizations band (Figma customizations-section + POC V3 copy).
 * Still image only — motion GIF deferred to a video/poster pass.
 */
export const beautyCosmeticsCustomizations: SolutionCustomizationsContent = {
    eyebrow: 'Customizations',
    headline:
        '200+ materials, finishes, and add-on options held in one place, to bring your brand to life.',
    highlightSpans: ['bring your brand to life.'],
    body: 'From concept to shelf, we deliver premium packaging with bespoke finishes, luxe materials, and precision printing that elevates your brand.',
    cta: {
        label: 'Browse all Customizations',
        href: WWW_ROUTES.customizations,
    },
    image: {
        src: `${CUSTOMIZATIONS_DIR}/materials-finishes.png`,
        alt: 'A studio spread of packaging materials and finishes — copper and gold foil-stamped panels, blind-embossed boards, a purple suede-laminated block, gilt-edged board stacks, and iridescent, textured and coloured swatch squares arranged on a pink set',
    },
};

/**
 * Fork 6 expertise band — header copy + six beauty stages.
 * Body UI: shared StagesBoard (poc-aslan SampleStageBoard interaction).
 */
export const beautyCosmeticsExpertise: SolutionExpertiseContent = {
    eyebrow: 'Expertise',
    headline:
        'One team owns every step, from your first dieline to the shelf.',
    highlightSpans: ['One team owns every step'],
    description:
        'Beauty packaging leaves no room for imperfection. Our end-to-end expertise — from strategy and design through manufacturing and delivery — covers every decision behind your packaging, so you get it right the first time and every run after.',
    cta: {
        label: 'Explore our expertise',
        href: WWW_ROUTES.expertise,
    },
    journeyLabels: [
        'Strategy',
        'Design',
        'Sample Prototyping',
        'Managed Manufacturing',
        'Supply Chain Management',
        'Packaging Fulfillment',
    ],
    stages: [
        {
            id: 'strategy',
            title: 'Strategy',
            headline: 'Plan the whole range, not one SKU',
            body: 'Beauty ranges grow by shade, size and season. Our 360° Strategic Framework maps each SKU onto shared substrates and tooling — so the range reads as one family, and Total Cost of Ownership drops as it scales.',
            cta: {
                label: 'Learn more',
                href: `${WWW_ROUTES.expertise}/strategy`,
            },
            mediaPlaceholder: 'Strategy workshop',
        },
        {
            id: 'design',
            title: 'Design',
            headline: 'Built around the bottle, not a box size',
            body: "Droppers, airless pumps and glass jars are top-heavy and fragile. We cut dielines to your primary's exact dimensions, then specify the finish that sells it — soft-touch lamination, cold foil, an embedded mirror.",
            cta: {
                label: 'Learn more',
                href: `${WWW_ROUTES.expertise}/design`,
            },
            media: {
                src: `${EXPERTISE_DIR}/expertise-design.png`,
                alt: 'A design team over a table of dielines, colour swatches, tube cartons and cosmetic samples',
            },
            mediaPlaceholder: 'Design studio',
        },
        {
            id: 'prototyping',
            title: 'Sample Prototyping',
            headline: 'Approve the shade before press runs',
            body: 'A six-shade range has to match across every substrate. Controlled sampling plus AI-powered colour management lock the range on a G7 Master press, and foam-insert samples reach you in about five business days.',
            cta: {
                label: 'Learn more',
                href: `${WWW_ROUTES.expertise}/prototyping`,
            },
            mediaPlaceholder: 'Samples on the bench',
        },
        {
            id: 'manufacturing',
            title: 'Managed Manufacturing',
            headline: 'Run two looks exactly like run one',
            body: 'Your finish only works if the factory can actually hold it. We match each SKU to a PakCertified facility audited to ISO 9001 and G7 Master, then govern every run so the reorder matches the launch exactly.',
            cta: {
                label: 'Learn more',
                href: `${WWW_ROUTES.expertise}/manufacturing`,
            },
            mediaPlaceholder: 'Production floor',
        },
        {
            id: 'supply-chain',
            title: 'Supply Chain Management',
            headline: 'One launch, one arrival date',
            body: 'Your carton, insert, gift bag and labels have different lead times and different factories. We consolidate them into one shipment, engineer the pallet so nothing scuffs, and clear customs on your Incoterms.',
            cta: {
                label: 'Learn more',
                href: `${WWW_ROUTES.expertise}/supply-chain`,
            },
            mediaPlaceholder: 'Freight ops',
        },
        {
            id: 'fulfillment',
            title: 'Packaging Fulfillment',
            headline: 'Gift sets, press kits and digital shelf',
            body: 'Holiday sets and press kits are assembled by hand to your spec. Retailer pack-outs meet Routing Guide standards, and FBA-compliant barcoding plus transit-tested secondary packaging covers the digital shelf.',
            cta: {
                label: 'Learn more',
                href: `${WWW_ROUTES.expertise}/fulfillment`,
            },
            mediaPlaceholder: 'Retail-ready packs',
        },
    ],
};

/**
 * Fork 7 case studies band — POC ProductOutcomes / CaseStudyCarousel copy.
 * Manufacturer voice; cards ported from productOutcomesData.js.
 */
export const beautyCosmeticsCaseStudies: CaseStudiesRowContent = {
    eyebrow: 'Proven results',
    headline: 'Real projects. Real outcomes.',
    description:
        'See how beauty brands turned packaging like this into a shelf-ready unboxing — made on our own line, with the run-to-run consistency and lead times to back it.',
    cta: {
        label: 'Explore case studies',
        href: WWW_ROUTES.caseStudies,
    },
    cards: [
        {
            id: 'glossier',
            tone: 'primary',
            brand: 'Glossier',
            tag: 'Cosmetics',
            title: 'Elevating a beauty icon with a fully branded unboxing moment',
            image: {
                src: `${CASE_STUDIES_DIR}/glossier.png`,
                alt: 'Glossier branded packaging unboxing',
            },
            href: '#',
        },
        {
            id: 'herb',
            tone: 'muted',
            brand: 'Herb',
            tag: 'Skincare',
            title: 'Clean, compliant folding cartons for a plant-based skincare line',
            image: {
                src: `${CASE_STUDIES_DIR}/herb.png`,
                alt: 'Herb skincare folding cartons',
            },
            href: '#',
        },
        {
            id: 'alto',
            tone: 'muted',
            brand: 'Alto',
            tag: 'Skincare',
            title: 'Compact, premium cartons built for the retail shelf',
            image: {
                src: `${CASE_STUDIES_DIR}/alto.png`,
                alt: 'Alto premium retail cartons',
            },
            href: '#',
        },
        {
            id: 'andplus',
            tone: 'primary',
            brand: 'Andplus',
            tag: 'Luxury Gifting',
            title: 'Bold, collectible packaging that turns a product into a keepsake',
            image: {
                src: `${CASE_STUDIES_DIR}/andplus.png`,
                alt: 'Andplus collectible gift packaging',
            },
            href: '#',
        },
    ],
};

/**
 * Video-focus case studies band — same Beauty stories, portrait Webflow-style cards.
 * First card includes a muted sample videoSrc for hover playback demos.
 */
export const beautyCosmeticsVideoCaseStudies: VideoCaseStudiesRowContent = {
    eyebrow: 'On camera',
    headline: 'Packaging moments, captured.',
    description:
        'Portrait stories with a glass footer — hover the first card to play a muted sample loop.',
    cta: {
        label: 'Explore case studies',
        href: WWW_ROUTES.caseStudies,
    },
    cards: [
        {
            id: 'glossier-video',
            brand: 'Glossier',
            title: 'Elevating a beauty icon with a fully branded unboxing moment',
            image: {
                src: `${CASE_STUDIES_DIR}/glossier.png`,
                alt: 'Glossier branded packaging unboxing',
            },
            logo: {
                src: `${LOGO_DIR}/benefit.png`,
                alt: 'Glossier',
            },
            videoSrc: `${CASE_STUDIES_DIR}/sample.mp4`,
            href: '#',
            metric: {
                title: "Project Hours Off The Client's Plate",
                body: 'Sourcing, sampling, color matching, and delivery were all handled on our end, allowing the brand to focus entirely on its rebrand.',
            },
        },
        {
            id: 'herb-video',
            brand: 'Herb',
            title: 'Clean, compliant folding cartons for a plant-based skincare line',
            image: {
                src: `${CASE_STUDIES_DIR}/herb.png`,
                alt: 'Herb skincare folding cartons',
            },
            logo: {
                src: `${LOGO_DIR}/innisfree.png`,
                alt: 'Herb',
            },
            href: '#',
        },
        {
            id: 'alto-video',
            brand: 'Alto',
            title: 'Compact, premium cartons built for the retail shelf',
            image: {
                src: `${CASE_STUDIES_DIR}/alto.png`,
                alt: 'Alto premium retail cartons',
            },
            logo: {
                src: `${LOGO_DIR}/drop.png`,
                alt: 'Alto',
            },
            href: '#',
        },
        {
            id: 'andplus-video',
            brand: 'Andplus',
            title: 'Bold, collectible packaging that turns a product into a keepsake',
            image: {
                src: `${CASE_STUDIES_DIR}/andplus.png`,
                alt: 'Andplus collectible gift packaging',
            },
            logo: {
                src: `${LOGO_DIR}/revlon.png`,
                alt: 'Andplus',
            },
            href: '#',
        },
    ],
};

/**
 * Fork 8 testimonials — reuse PDP mock reviews until PROD-2293 Sanity testimonials land.
 */
export const beautyCosmeticsTestimonials: SolutionTestimonialsContent = {
    items: MOCK_PRODUCT_TESTIMONIALS,
    aggregate: MOCK_TESTIMONIALS_AGGREGATE,
};

/**
 * Fork 9 FAQs — beauty packaging Q&As matching ProductFaq / FaqSection props.
 */
export const beautyCosmeticsFaqs: SolutionFaqsContent = {
    items: [
        {
            question:
                'What packaging formats work best for beauty and cosmetics brands?',
            answerPlain:
                'Rigid boxes, folding cartons, and sleeve-and-tray sets are the most common starting points. We match format to channel — retail shelf, DTC unboxing, or gift kits — and to how your SKUs share board and tooling.',
        },
        {
            question: 'Can you match my brand colors and specialty finishes?',
            answerPlain:
                'Yes. Soft-touch, foil, emboss/deboss, and spot UV are routine on beauty runs. We proof color and finish on production-intent samples before you commit to a full order.',
        },
        {
            question: 'What are typical MOQs and lead times for beauty packaging?',
            answerPlain:
                'MOQs depend on format and finish complexity, but custom beauty cartons and rigid sets often start in the low thousands. Lead times cover design lock, sampling, and production — we map dates against your launch once the brief is clear.',
        },
        {
            question:
                'Do you help with inserts, dielines, and multi-SKU systems?',
            answerPlain:
                'Our design and prototyping teams build fitted inserts, shared dielines across a shade or size range, and kits that stay cohesive as the line grows — so you are not retooling every SKU from scratch.',
        },
        {
            question: 'How do I get a quote for beauty packaging?',
            answerPlain:
                'Share your product sizes, target quantity, and any brand references. Start a quote request or talk with our team — we will recommend a format path and return production-ready pricing.',
        },
    ],
    footerHref: WWW_ROUTES.contact,
    footerLabel: "Let's chat",
};
