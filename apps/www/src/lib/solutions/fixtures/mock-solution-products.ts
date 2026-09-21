import type {SolutionHeroTile} from '@/lib/solutions/types';
import {WWW_ROUTES} from '@/lib/www-routes';

/**
 * Pre-customized solution products for the Industry LP hero carousel/dialog.
 * Temporary until Content Modeling ships curated solution-product refs on `solution`.
 */

export type SolutionProductCustomizationMock = {
    id: string;
    category: string;
    title: string;
    description: string;
    learnMoreHref: string;
};

export type SolutionProductMock = {
    id: string;
    title: string;
    detailHref: string;
    image?: {src: string; alt: string} | null;
    customizations: SolutionProductCustomizationMock[];
};

const TILE_WIDTHS = [401, 312, 349, 347, 334, 270, 270] as const;

const DEFAULT_CUSTOMIZATIONS: SolutionProductCustomizationMock[] = [
    {
        id: 'material',
        category: 'MATERIAL',
        title: 'Metalized Polyester (VMPET) Pouch Film',
        description:
            'A vacuum-metalized polyester layer inside the laminate. It is what gives the interior its silver face.',
        learnMoreHref: '/customizations',
    },
    {
        id: 'finishing',
        category: 'FINISHING',
        title: 'Matte Lamination',
        description:
            'A matte outer film over the print. Cuts glare on a curved surface, where gloss would blow out under store lighting.',
        learnMoreHref: '/customizations',
    },
    {
        id: 'printing',
        category: 'PRINTING',
        title: 'Gravure Printing (Rotogravure)',
        description:
            'Engraved-cylinder printing onto the film web. The standard method for long-run flexible packaging.',
        learnMoreHref: '/customizations',
    },
];

const PRODUCT_TITLES = [
    'Bath Salt Stand Up Pouch',
    'Serum Dropper Carton',
    'Fragrance Rigid Box',
    'Lip Balm Sleeve',
    'Skincare Tube Kit',
    'Powder Jar Mailer',
    'Mask Sachet Set',
    'Candle Gift Sleeve',
    'Toner Bottle Wrap',
    'Compact Palette Tray',
    'Oil Ampoule Sleeve',
    'Body Butter Tub',
    'Nail Polish Mailer',
    'Clay Mask Pouch',
    'Hair Oil Carton',
    'Serum Travel Kit',
] as const;

export const MOCK_SOLUTION_PRODUCTS: SolutionProductMock[] =
    PRODUCT_TITLES.map((title, index) => ({
        id: `mock-product-${index + 1}`,
        title,
        detailHref: WWW_ROUTES.products,
        image: null,
        customizations: DEFAULT_CUSTOMIZATIONS.map((item) => ({
            ...item,
            id: `${item.id}-${index + 1}`,
        })),
    }));

/** Empty carousel tiles (no images) keyed to mock products. */
export const MOCK_SOLUTION_PRODUCT_TILES: SolutionHeroTile[] =
    MOCK_SOLUTION_PRODUCTS.map((product, index) => ({
        id: product.id,
        label: product.title,
        width: TILE_WIDTHS[index % TILE_WIDTHS.length],
    }));

export function getMockSolutionProduct(
    id: string,
): SolutionProductMock | undefined {
    return MOCK_SOLUTION_PRODUCTS.find((product) => product.id === id);
}
