import type {
    ExpertiseServiceDimensionDoc,
    PageSectionSignatureSystemDoc,
} from '@pakfactory/sanity/queries';

import {mapSectionChrome} from '@/lib/sections/map-section-chrome';
import type {SectionAlign} from '@/lib/sections/map-section-chrome';

export type SignatureDimension = {
    /** In-page anchor — also the `#hash` a deep link opens. */
    id: string;
    title: string;
    summary?: string;
    /** Service image — shown beside the list when there is no named method. */
    image?: {src: string; alt: string};
    points: {label: string; gloss?: string}[];
};

export type SignatureProblem = {
    label: string;
    /** Anchor of the dimension this problem opens, when linked. */
    dimensionId?: string;
};

export type SignatureSystemContent = {
    eyebrow?: string;
    heading?: string;
    intro?: string;
    /** Body paragraphs (Portable Text flattened to plain text). */
    body: string[];
    problems: SignatureProblem[];
    problemsCaption?: string;
    /** Named method (ring label). Absent → the section lists services with their images. */
    systemName?: string;
    systemHeading?: string;
    systemIntro?: string;
    dimensions: SignatureDimension[];
    align: SectionAlign;
    borderTop: boolean;
    borderBottom: boolean;
    cta?: {label: string; href: string};
};

/** `Value Engineering` → `value-engineering` (fallback when a service has no slug). */
function slugify(value: string): string {
    return value
        .toLowerCase()
        .normalize('NFKD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/&/g, ' and ')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

function mapDimension(
    doc: ExpertiseServiceDimensionDoc,
): (SignatureDimension & {_id?: string}) | null {
    const title = doc.title?.trim();
    if (!title) return null;
    const id = doc.slug?.trim() || slugify(title);
    const summary = doc.summary?.trim();
    const imageSrc = doc.imageSrc?.trim();
    const points: {label: string; gloss?: string}[] = [];
    for (const point of doc.points ?? []) {
        const label = point?.label?.trim();
        if (!label) continue;
        const gloss = point.gloss?.trim();
        points.push({label, ...(gloss ? {gloss} : {})});
    }
    return {
        ...(doc._id ? {_id: doc._id} : {}),
        id,
        title,
        ...(summary ? {summary} : {}),
        ...(imageSrc
            ? {image: {src: imageSrc, alt: doc.imageAlt?.trim() || title}}
            : {}),
        points,
    };
}

/**
 * Map Sanity `signatureSystem` → SignatureSystem props (PROD-2577).
 * Dimensions must already be resolved (custom list, or host `services` via
 * {@link applySignatureSystemInherit}). No dimensions → null (nothing to explain).
 */
export function mapSignatureSystem(
    section: PageSectionSignatureSystemDoc,
): SignatureSystemContent | null {
    const systemName = section.systemName?.trim();
    const resolved = (section.services ?? [])
        .map(mapDimension)
        .filter((item): item is NonNullable<typeof item> => item != null);
    if (resolved.length === 0) return null;

    const anchorById = new Map(
        resolved
            .filter((item) => item._id)
            .map((item) => [item._id as string, item.id]),
    );
    const dimensions: SignatureDimension[] = resolved.map(
        ({_id: _unused, ...dimension}) => dimension,
    );

    const problems: SignatureProblem[] = [];
    for (const row of section.problems ?? []) {
        const label = row?.label?.trim();
        if (!label) continue;
        // Link only when the answering service is one of the shown dimensions.
        const dimensionId = row.serviceId
            ? anchorById.get(row.serviceId)
            : undefined;
        problems.push({label, ...(dimensionId ? {dimensionId} : {})});
    }

    const body = (section.bodyPlain ?? '')
        .split(/\n{2,}/)
        .map((paragraph) => paragraph.trim())
        .filter(Boolean);

    const chrome = mapSectionChrome(section);
    const heading = section.heading?.trim();
    const intro = section.intro?.trim();
    const problemsCaption = section.problemsCaption?.trim();
    const systemHeading = section.systemHeading?.trim();
    const systemIntro = section.systemIntro?.trim();

    return {
        ...(chrome.eyebrow ? {eyebrow: chrome.eyebrow} : {}),
        ...(heading ? {heading} : {}),
        ...(intro ? {intro} : {}),
        body,
        problems,
        ...(problemsCaption ? {problemsCaption} : {}),
        ...(systemName ? {systemName} : {}),
        ...(systemHeading ? {systemHeading} : {}),
        ...(systemIntro ? {systemIntro} : {}),
        dimensions,
        align: chrome.align,
        borderTop: chrome.borderTop,
        borderBottom: chrome.borderBottom,
        ...(chrome.cta ? {cta: chrome.cta} : {}),
    };
}
