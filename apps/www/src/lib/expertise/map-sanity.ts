import type {
    ExpertiseStageBySlugDoc,
    ExpertiseStageCardDoc,
    PageSectionDoc,
} from '@pakfactory/sanity/queries';
import {applySignatureSystemInherit} from '@/lib/sections/inherit-signature-system';
import {
    applyCaseStudyInherit,
    applyFaqInherit,
} from '@/lib/sections/merge-solution-sections';
import {applySectionTokens} from '@/lib/sections/resolve-section-tokens';
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

/**
 * Stage body sections, resolved for render: host lists fill empty sections that
 * allow it (ADR-020 §8 — services → signatureSystem, FAQs → faqSection, featured
 * else tagged case studies → caseStudiesRow), then page-field tokens resolve
 * from the stage. `expertiseSequence` inherits on the page view, which knows the
 * ordered stage list.
 */
function resolveStageSections(
    doc: ExpertiseStageBySlugDoc,
    title: string,
    h1: string,
    slug: string,
): PageSectionDoc[] {
    const content = (doc.sections ?? []).filter(
        (section): section is PageSectionDoc =>
            Boolean(section?._key && section?._type),
    );
    const studies =
        (doc.featuredStudies?.length ?? 0) > 0
            ? doc.featuredStudies
            : doc.taggedStudies;
    const inherited = applyCaseStudyInherit(
        applyFaqInherit(
            applySignatureSystemInherit(content, doc.services),
            doc.faqs,
        ),
        studies,
    );
    const description = doc.description?.trim() ?? '';
    return applySectionTokens(inherited, {
        h1,
        title,
        description,
        shortName: title,
        shortDescription: description,
        slug,
    });
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

    const heroImageUrl = doc.heroImage
        ? (sanityImageBaseUrl(doc.heroImage) ?? undefined)
        : undefined;
    const heroSecondaryLabel = doc.heroSecondaryLabel?.trim();
    const heroSecondaryTarget = doc.heroSecondaryTarget?.trim();

    return {
        slug,
        title,
        h1,
        ...(tagline ? {tagline} : {}),
        ...(description ? {description} : {}),
        ...(doc.status ? {status: doc.status} : {}),
        ...(diagramUrl ? {diagramUrl, diagramAlt} : {}),
        ...(doc.heroCtaLabel?.trim()
            ? {heroCtaLabel: doc.heroCtaLabel.trim()}
            : {}),
        ...(heroSecondaryLabel && heroSecondaryTarget
            ? {heroSecondary: {label: heroSecondaryLabel, target: heroSecondaryTarget}}
            : {}),
        ...(heroImageUrl
            ? {heroImageUrl, heroImageAlt: resolveImageAlt(doc.heroImage, title)}
            : {}),
        sections: resolveStageSections(doc, title, h1, slug),
        ...(doc.ogTitle?.trim() ? {ogTitle: doc.ogTitle.trim()} : {}),
        ...(doc.ogDescription?.trim()
            ? {ogDescription: doc.ogDescription.trim()}
            : {}),
        ...(doc.ogImageUrl?.trim() ? {ogImageUrl: doc.ogImageUrl.trim()} : {}),
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
