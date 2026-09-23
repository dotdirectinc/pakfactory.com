import type {PortableTextBlock} from '@portabletext/types';
import type {
    SolutionBySlugDoc,
    SolutionFormatRefDoc,
    SolutionStyleBySlugsDoc,
    SolutionStyleCardDoc,
    SolutionWithPageDoc,
} from '@pakfactory/sanity/queries';
import {mapSanityProduct} from '@/lib/catalog/map-sanity';
import type {Product} from '@/lib/catalog/types';
import {
    resolveImageAlt,
    sanityImageBaseUrl,
} from '@/lib/sanity/image';
import type {
    SolutionCard,
    SolutionFormat,
    SolutionPage,
    SolutionRelatedLink,
    SolutionStyleCard,
    SolutionStylePage,
} from '@/lib/solutions/types';

/** Drop partial/stale related entries that lack line+style for ProductCard. */
export function isCompleteProduct(product: Product): boolean {
    return Boolean(
        product.productLine?.slug &&
            product.productLine?.title &&
            product.productStyle?.slug &&
            product.productStyle?.title,
    );
}

function mapRelated(
    items:
        | Array<{title?: string | null; slug?: string | null}>
        | null
        | undefined,
): SolutionRelatedLink[] {
    if (!items?.length) return [];
    return items
        .map((item) => {
            const slug = item.slug?.trim();
            const title = item.title?.trim();
            if (!slug || !title) return null;
            return {slug, title};
        })
        .filter((item): item is SolutionRelatedLink => item != null);
}

function mapFormat(item: SolutionFormatRefDoc): SolutionFormat | null {
    const slug = item.slug?.trim();
    const title = item.title?.trim();
    if (!slug || !title) return null;
    const description =
        item.description?.trim() || item.cardSummary?.trim() || undefined;
    const imageUrl = item.cardImage
        ? (sanityImageBaseUrl(item.cardImage) ?? null)
        : null;
    const imageAlt = item.cardImage
        ? resolveImageAlt(item.cardImage, title)
        : title;
    return {
        slug,
        title,
        ...(description ? {description} : {}),
        ...(imageUrl ? {imageUrl, imageAlt} : {}),
    };
}

export function mapSanitySolutionCard(
    doc: SolutionWithPageDoc,
): SolutionCard | null {
    const slug = doc.slug?.trim();
    const title =
        doc.shortName?.trim() || doc.title?.trim() || undefined;
    if (!slug || !title) return null;

    const description = doc.shortDescription?.trim() || undefined;
    const imageUrl = doc.featuredImage
        ? (sanityImageBaseUrl(doc.featuredImage) ?? null)
        : null;
    const imageAlt = doc.featuredImage
        ? resolveImageAlt(doc.featuredImage, title)
        : title;

    return {
        slug,
        title,
        ...(description ? {description} : {}),
        ...(imageUrl ? {imageUrl, imageAlt} : {}),
    };
}

export function mapSanitySolution(doc: SolutionBySlugDoc): SolutionPage | null {
    const slug = doc.slug?.trim();
    const title = doc.title?.trim();
    if (!slug || !title) return null;

    const h1 = doc.h1?.trim() || title;
    const shortName = doc.shortName?.trim() || title;
    const shortDescription = doc.shortDescription?.trim() || '';
    const description = Array.isArray(doc.description)
        ? (doc.description as PortableTextBlock[])
        : [];
    const descriptionText = doc.descriptionText?.trim() || '';

    const featuredImageUrl = doc.featuredImage
        ? (sanityImageBaseUrl(doc.featuredImage) ?? null)
        : null;
    const featuredImageAlt = doc.featuredImage
        ? resolveImageAlt(doc.featuredImage, h1)
        : h1;

    const packagingFormats = (doc.packagingFormats ?? [])
        .map(mapFormat)
        .filter((item): item is SolutionFormat => item != null);

    const relatedProducts = (doc.relatedProducts ?? [])
        .map(mapSanityProduct)
        .filter((item): item is Product => item != null)
        .filter(isCompleteProduct);

    const metaTitle = doc.metaTitle?.trim();
    const metaDescription = doc.metaDescription?.trim();
    const canonicalUrl = doc.canonicalUrl?.trim();

    return {
        title,
        h1,
        shortName,
        slug,
        shortDescription,
        description,
        descriptionText,
        featuredImageUrl,
        featuredImageAlt,
        packagingFormats,
        relatedProducts,
        relatedCaseStudies: mapRelated(doc.relatedCaseStudies),
        relatedSolutions: mapRelated(doc.relatedSolutions),
        ...(metaTitle ? {metaTitle} : {}),
        ...(metaDescription ? {metaDescription} : {}),
        allowIndex: doc.allowIndex !== false,
        allowFollow: doc.allowFollow !== false,
        noImageIndex: doc.noImageIndex === true,
        ...(canonicalUrl ? {canonicalUrl} : {}),
    };
}

export function mapSanitySolutionStyleCard(
    doc: SolutionStyleCardDoc,
): SolutionStyleCard | null {
    const slug = doc.slug?.trim();
    const title =
        doc.shortName?.trim() || doc.title?.trim() || undefined;
    if (!slug || !title) return null;

    const description = doc.shortDescription?.trim() || undefined;
    const imageUrl = doc.featuredImage
        ? (sanityImageBaseUrl(doc.featuredImage) ?? null)
        : null;
    const imageAlt = doc.featuredImage
        ? resolveImageAlt(doc.featuredImage, title)
        : title;

    return {
        slug,
        title,
        ...(description ? {description} : {}),
        ...(imageUrl ? {imageUrl, imageAlt} : {}),
    };
}

export function mapSanitySolutionStylePage(
    doc: SolutionStyleBySlugsDoc,
): SolutionStylePage | null {
    const slug = doc.slug?.trim();
    const title = doc.title?.trim();
    if (!slug || !title) return null;

    const h1 = doc.h1?.trim() || title;
    const shortName = doc.shortName?.trim() || title;
    const shortDescription = doc.shortDescription?.trim() || '';
    const descriptionText =
        doc.descriptionText?.trim() || shortDescription;

    const featuredImageUrl = doc.featuredImage
        ? (sanityImageBaseUrl(doc.featuredImage) ?? null)
        : null;
    const featuredImageAlt = doc.featuredImage
        ? resolveImageAlt(doc.featuredImage, h1)
        : h1;

    const metaTitle = doc.metaTitle?.trim();
    const metaDescription = doc.metaDescription?.trim();
    const canonicalUrl = doc.canonicalUrl?.trim();

    return {
        slug,
        title,
        h1,
        shortName,
        shortDescription,
        descriptionText,
        featuredImageUrl,
        featuredImageAlt,
        ...(metaTitle ? {metaTitle} : {}),
        ...(metaDescription ? {metaDescription} : {}),
        allowIndex: doc.allowIndex !== false,
        allowFollow: doc.allowFollow !== false,
        noImageIndex: doc.noImageIndex === true,
        ...(canonicalUrl ? {canonicalUrl} : {}),
    };
}
