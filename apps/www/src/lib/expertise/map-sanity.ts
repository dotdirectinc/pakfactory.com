import type {
    ExpertiseStageBySlugDoc,
    ExpertiseStageCardDoc,
} from '@pakfactory/sanity/queries';
import {
    resolveImageAlt,
    sanityImageBaseUrl,
} from '@/lib/sanity/image';
import type {
    ExpertiseStageCard,
    ExpertiseStagePage,
} from '@/lib/expertise/types';

export function mapSanityExpertiseStageCard(
    doc: ExpertiseStageCardDoc,
): ExpertiseStageCard | null {
    const slug = doc.slug?.trim();
    const title = doc.title?.trim();
    if (!slug || !title) return null;

    const description = doc.description?.trim() || undefined;
    const imageUrl = doc.diagram
        ? (sanityImageBaseUrl(doc.diagram) ?? null)
        : null;
    const imageAlt = doc.diagram
        ? resolveImageAlt(doc.diagram, title)
        : title;

    return {
        slug,
        title,
        ...(description ? {description} : {}),
        ...(imageUrl ? {imageUrl, imageAlt} : {}),
        ...(doc.status ? {status: doc.status} : {}),
    };
}

export function mapSanityExpertiseStage(
    doc: ExpertiseStageBySlugDoc,
): ExpertiseStagePage | null {
    const slug = doc.slug?.trim();
    const title = doc.title?.trim();
    if (!slug || !title) return null;

    const h1 = doc.h1?.trim() || title;
    const tagline = doc.tagline?.trim() || undefined;
    const description = doc.description?.trim() || undefined;
    const diagramUrl = doc.diagram
        ? (sanityImageBaseUrl(doc.diagram) ?? null)
        : null;
    const diagramAlt = doc.diagram
        ? resolveImageAlt(doc.diagram, title)
        : title;

    return {
        slug,
        title,
        h1,
        ...(tagline ? {tagline} : {}),
        ...(description ? {description} : {}),
        ...(doc.status ? {status: doc.status} : {}),
        ...(diagramUrl ? {diagramUrl, diagramAlt} : {}),
        ...(doc.metaTitle?.trim()
            ? {metaTitle: doc.metaTitle.trim()}
            : {}),
        ...(doc.metaDescription?.trim()
            ? {metaDescription: doc.metaDescription.trim()}
            : {}),
        allowIndex: doc.allowIndex !== false,
        allowFollow: doc.allowFollow !== false,
        noImageIndex: doc.noImageIndex === true,
        ...(doc.canonicalUrl?.trim()
            ? {canonicalUrl: doc.canonicalUrl.trim()}
            : {}),
    };
}
