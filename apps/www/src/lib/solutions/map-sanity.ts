import type {PortableTextBlock} from '@portabletext/types';
import type {
    SolutionBySlugDoc,
    SolutionFormatRefDoc,
    SolutionRelatedRefDoc,
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
    items: SolutionRelatedRefDoc[] | null | undefined,
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
    const imageUrl = doc.heroImage
        ? (sanityImageBaseUrl(doc.heroImage) ?? null)
        : null;
    const imageAlt = doc.heroImage
        ? resolveImageAlt(doc.heroImage, title)
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

    const heroImageUrl = doc.heroImage
        ? (sanityImageBaseUrl(doc.heroImage) ?? null)
        : null;
    const heroImageAlt = doc.heroImage
        ? resolveImageAlt(doc.heroImage, h1)
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
        heroImageUrl,
        heroImageAlt,
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
