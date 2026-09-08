export type ProductKind = 'standard' | 'inspiration';

/** Category slug from Sanity `customizationCategory.slug` (not a fixed union). */
export type CustomizationCategory = string;

export type CustomizationOption = {
    id: string;
    label: string;
    /** Sanity customizationCategory.slug */
    category: CustomizationCategory;
    categoryTitle?: string;
    categoryOrder?: number;
    categoryDescription?: string;
    typeId?: string;
    typeSlug?: string;
    typeTitle?: string;
    typeDescription?: string;
    cardinality?: 'one' | 'many';
    slug?: string;
    shortDescription?: string;
    description?: string;
    imageUrl?: string | null;
    preselected?: boolean;
    role?: 'configurable' | 'reference';
    status?: string;
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

export type ProductDimensionRange = {
    lengthMin?: number;
    lengthMax?: number;
    widthMin?: number;
    widthMax?: number;
    depthMin?: number;
    depthMax?: number;
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
    dimensionRange?: ProductDimensionRange;
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
