export type ProductKind = 'standard' | 'inspiration';

export type CustomizationCategory = 'material' | 'print' | 'finish';

export type CustomizationOption = {
    id: string;
    label: string;
    category: CustomizationCategory;
};

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
};

export type Product = {
    title: string;
    slug: string;
    sku: string;
    kind: ProductKind;
    media: CatalogMedia[];
    description: string;
    productLine: ProductLineRef;
    productStyle: ProductStyleRef;
    availableCustomizations: CustomizationOption[];
    primarySolution?: string;
    moq?: number;
};

export type ProductLine = {
    slug: string;
    title: string;
    description: string;
    styles: ProductStyleRef[];
    products: Product[];
};

export type ProductsSegmentResult =
    | {type: 'line'; line: ProductLine}
    | {type: 'product'; product: Product};
