import type {Product, ProductLine, ProductLineRef, ProductStyleRef} from '@/lib/catalog/types';

const rigidBoxesLine: ProductLineRef = {
    slug: 'rigid-boxes',
    title: 'Rigid Boxes',
};

const magneticClosureStyle: ProductStyleRef = {
    slug: 'magnetic-closure',
    title: 'Magnetic Closure',
};

const matteMagneticGiftBox: Product = {
    title: 'Matte Magnetic Gift Box',
    slug: 'matte-magnetic-gift-box',
    sku: 'RB-1001',
    kind: 'standard',
    description:
        'Premium two-piece rigid box with a magnetic lid — a clean starting point for gifting and retail unboxing.',
    media: [
        {alt: 'Matte Magnetic Gift Box, closed'},
        {alt: 'Matte Magnetic Gift Box, open'},
        {alt: 'Matte Magnetic Gift Box, side'},
    ],
    productLine: rigidBoxesLine,
    productStyle: magneticClosureStyle,
    availableCustomizations: [
        {id: 'rigid-board', label: 'Rigid Board', category: 'material'},
        {id: 'cmyk-offset', label: 'CMYK Offset Printing', category: 'print'},
        {id: 'matte-lamination', label: 'Matte Lamination', category: 'finish'},
    ],
};

const shirtBox: Product = {
    title: 'Shirt Box',
    slug: 'shirt-box',
    sku: 'INS-3001',
    kind: 'inspiration',
    description:
        'A rigid magnetic-closure box pre-customized for apparel presentation — add as-is or tweak before requesting a quote.',
    media: [
        {alt: 'Shirt Box, closed'},
        {alt: 'Shirt Box, open'},
        {alt: 'Shirt Box, side'},
    ],
    productLine: rigidBoxesLine,
    productStyle: magneticClosureStyle,
    primarySolution: 'apparel',
    availableCustomizations: [
        {id: 'rigid-board', label: 'Rigid Board', category: 'material'},
        {id: 'cmyk-offset', label: 'CMYK Offset Printing', category: 'print'},
        {id: 'matte-lamination', label: 'Matte Lamination', category: 'finish'},
        {id: 'foil-stamping', label: 'Foil Stamping', category: 'finish'},
    ],
};

export const LINES: ProductLine[] = [
    {
        slug: rigidBoxesLine.slug,
        title: rigidBoxesLine.title,
        description:
            'Premium rigid packaging with wrap, structure, and closure options for retail and gifting.',
        styles: [magneticClosureStyle],
        products: [matteMagneticGiftBox, shirtBox],
    },
];

export const PRODUCTS: Product[] = LINES.flatMap((line) => line.products);
