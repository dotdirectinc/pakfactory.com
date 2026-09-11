import {
    type CatalogLibraryOptionDoc,
    type CatalogProductDoc,
    type CatalogProductLineDoc,
} from '@pakfactory/sanity/queries';
import type {CustomizationCardData} from '@/components/customization/customization-card';
import {
    resolveImageAlt,
    sanityImageBaseUrl,
} from '@/lib/sanity/image';
import type {
    CatalogMedia,
    CustomizationOption,
    Product,
    ProductKind,
    ProductLine,
    ProductLineRef,
    ProductStyleRef,
} from '@/lib/catalog/types';

function mediaFromSanity(
    media: unknown[] | null | undefined,
    titleFallback: string,
): CatalogMedia[] {
    if (!Array.isArray(media) || media.length === 0) {
        return [{alt: titleFallback}];
    }
    return media.map((item) => {
        const src = sanityImageBaseUrl(item);
        const alt = resolveImageAlt(item, titleFallback);
        return src ? {src, alt} : {alt};
    });
}

/** First non-empty trimmed string — used for option detail copy fallbacks. */
function firstNonEmpty(
    ...candidates: Array<string | null | undefined>
): string {
    for (const value of candidates) {
        const trimmed = value?.trim();
        if (trimmed) return trimmed;
    }
    return '';
}

function cardImageFromSanity(
    cardImage: unknown | null | undefined,
    titleFallback: string,
): {imageUrl: string | null; imageAlt: string} {
    const imageUrl = cardImage ? (sanityImageBaseUrl(cardImage) ?? null) : null;
    const imageAlt = cardImage
        ? resolveImageAlt(cardImage, titleFallback)
        : titleFallback;
    return {imageUrl, imageAlt};
}

function mapStyleRef(
    style: {
        slug: string | null;
        title: string;
        description?: string | null;
        cardImage?: unknown | null;
    },
): ProductStyleRef | null {
    const styleSlug = style.slug?.trim();
    const title = style.title?.trim();
    if (!styleSlug || !title) return null;
    const description = style.description?.trim();
    const {imageUrl, imageAlt} = cardImageFromSanity(style.cardImage, title);
    return {
        slug: styleSlug,
        title,
        ...(description ? {description} : {}),
        ...(imageUrl ? {imageUrl, imageAlt} : {}),
    };
}

function preferStyleWithImage(
    existing: ProductStyleRef | undefined,
    next: ProductStyleRef,
): ProductStyleRef {
    if (!existing) return next;
    if (!existing.imageUrl && next.imageUrl) {
        return {
            ...existing,
            imageUrl: next.imageUrl,
            ...(next.imageAlt ? {imageAlt: next.imageAlt} : {}),
            ...(next.description && !existing.description
                ? {description: next.description}
                : {}),
        };
    }
    return existing;
}

function mapAvailableCustomization(
    row: NonNullable<CatalogProductDoc['availableCustomizations']>[number],
): CustomizationOption | null {
    const option = row?.customization;
    if (!option?._id || !option.title) return null;
    if (option.status && option.status !== 'active') return null;
    // Configurator only surfaces configurable options (ADR-017 role).
    if (option.role === 'reference') return null;

    const type = option.type;
    const category = type?.category;
    const categorySlug = category?.slug?.trim();
    if (!categorySlug) return null;

    const firstImage = Array.isArray(option.media) ? option.media[0] : null;

    // No shortDescription on customizationOption yet — fall back through
    // meta / glossary / benefits / type description for the detail panel.
    const description = firstNonEmpty(
        option.metaDescription,
        option.glossaryPlain,
        option.benefitsPlain,
        type?.description,
    );

    return {
        id: option._id,
        label: option.title,
        slug: option.slug ?? undefined,
        category: categorySlug,
        categoryTitle: category?.title ?? undefined,
        categoryOrder:
            typeof category?.order === 'number' ? category.order : undefined,
        categoryDescription: category?.description ?? undefined,
        typeId: type?._id ?? undefined,
        typeSlug: type?.slug ?? undefined,
        typeTitle: type?.title ?? undefined,
        typeDescription: type?.description ?? undefined,
        cardinality: type?.cardinality === 'many' ? 'many' : 'one',
        imageUrl: firstImage ? (sanityImageBaseUrl(firstImage) ?? null) : null,
        shortDescription: '',
        description,
        preselected: Boolean(row.preselected),
        role: option.role ?? undefined,
        status: option.status ?? undefined,
    };
}

export function mapSanityProduct(doc: CatalogProductDoc): Product | null {
    const slug = doc.slug?.trim();
    if (!slug || !doc.title) return null;

    const lineSlug = doc.productLine?.slug?.trim();
    const lineTitle = doc.productLine?.title?.trim();
    if (!lineSlug || !lineTitle) return null;

    const styleSlug = doc.productStyle?.slug?.trim();
    const styleTitle = doc.productStyle?.title?.trim();
    if (!styleSlug || !styleTitle) return null;

    const kind: ProductKind =
        doc.kind === 'inspiration' ? 'inspiration' : 'standard';

    const productLine: ProductLineRef = {slug: lineSlug, title: lineTitle};
    const productStyle = mapStyleRef({
        slug: styleSlug,
        title: styleTitle,
        description: doc.productStyle?.description,
        cardImage: doc.productStyle?.cardImage,
    });
    if (!productStyle) return null;

    const availableCustomizations = (doc.availableCustomizations ?? [])
        .map(mapAvailableCustomization)
        .filter((item): item is CustomizationOption => item != null);

    const dim = doc.dimensionRange;
    const dimensionRange = dim
        ? {
              ...(typeof dim.lengthMin === 'number'
                  ? {lengthMin: dim.lengthMin}
                  : {}),
              ...(typeof dim.lengthMax === 'number'
                  ? {lengthMax: dim.lengthMax}
                  : {}),
              ...(typeof dim.widthMin === 'number'
                  ? {widthMin: dim.widthMin}
                  : {}),
              ...(typeof dim.widthMax === 'number'
                  ? {widthMax: dim.widthMax}
                  : {}),
              ...(typeof dim.depthMin === 'number'
                  ? {depthMin: dim.depthMin}
                  : {}),
              ...(typeof dim.depthMax === 'number'
                  ? {depthMax: dim.depthMax}
                  : {}),
          }
        : undefined;

    return {
        title: doc.title,
        slug,
        sku: doc.sku?.trim() || slug,
        kind,
        description: doc.description?.trim() || '',
        media: mediaFromSanity(doc.media, doc.title),
        productLine,
        productStyle,
        availableCustomizations,
        ...(doc.primarySolution
            ? {primarySolution: doc.primarySolution}
            : {}),
        ...(typeof doc.moq === 'number' ? {moq: doc.moq} : {}),
        ...(dimensionRange && Object.keys(dimensionRange).length
            ? {dimensionRange}
            : {}),
    };
}

export function mapSanityProductLine(doc: CatalogProductLineDoc): ProductLine | null {
    const slug = doc.slug?.trim();
    if (!slug || !doc.title) return null;

    const products = (doc.products ?? [])
        .map(mapSanityProduct)
        .filter((item): item is Product => item != null);

    const stylesFromField = (doc.styles ?? [])
        .map(mapStyleRef)
        .filter((item): item is ProductStyleRef => item != null);

    const stylesFromProducts = products.map((p) => p.productStyle);
    const stylesBySlug = new Map<string, ProductStyleRef>();
    for (const style of [...stylesFromField, ...stylesFromProducts]) {
        stylesBySlug.set(
            style.slug,
            preferStyleWithImage(stylesBySlug.get(style.slug), style),
        );
    }

    const {imageUrl, imageAlt} = cardImageFromSanity(doc.cardImage, doc.title);

    return {
        slug,
        title: doc.title,
        description: doc.description?.trim() || doc.cardSummary?.trim() || '',
        ...(imageUrl ? {imageUrl, imageAlt} : {}),
        styles: [...stylesBySlug.values()],
        products,
    };
}

export function mapSanityLibraryOption(
    doc: CatalogLibraryOptionDoc,
): CustomizationCardData | null {
    const slug = doc.slug?.trim();
    const categorySlug = doc.category?.slug?.trim();
    if (!slug || !doc.title || !categorySlug) return null;

    const firstImage = Array.isArray(doc.media) ? doc.media[0] : null;
    const imageUrl = firstImage ? (sanityImageBaseUrl(firstImage) ?? null) : null;
    const imageAlt = firstImage
        ? resolveImageAlt(firstImage, doc.title)
        : doc.title;

    return {
        _id: doc._id,
        title: doc.title,
        slug,
        categoryValue: categorySlug,
        categoryLabel: doc.category?.title ?? categorySlug,
        imageUrl,
        imageAlt,
    };
}
