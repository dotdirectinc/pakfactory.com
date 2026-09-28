import type {
    PageSectionDoc,
    PageSectionExpertiseSequenceDoc,
    PageSectionExpertiseStageDoc,
} from '@pakfactory/sanity/queries';

import {mapSectionChrome} from '@/lib/sections/map-section-chrome';
import type {SectionAlign} from '@/lib/sections/map-section-chrome';
import {shouldInheritSectionList} from '@/lib/sections/merge-solution-sections';
import type {ExpertiseStageCard} from '@/lib/expertise/types';
import {expertiseHref} from '@/lib/www-routes';

export type StagePathStep = {
    id: string;
    title: string;
    /** Link to the stage page — absent for the current stage and unreleased stages. */
    href?: string;
    current: boolean;
    comingSoon: boolean;
};

export type StagePathLink = {label: string; href: string};

export type ExpertiseLifecycleContent = {
    eyebrow?: string;
    heading?: string;
    intro?: string;
    steps: StagePathStep[];
    previous?: StagePathLink;
    next?: StagePathLink;
    align: SectionAlign;
    borderTop: boolean;
    borderBottom: boolean;
};

/**
 * Fill an empty `expertiseSequence` with every stage in hub order (featured pin
 * order, then title — ADR-017) when the stage page hosts it. A curated list wins.
 */
export function applyStageSequenceInherit(
    sections: PageSectionDoc[],
    orderedStages: ExpertiseStageCard[],
): PageSectionDoc[] {
    if (orderedStages.length === 0) return sections;
    const fallback: PageSectionExpertiseStageDoc[] = orderedStages.map(
        (stage) => ({
            _id: stage.slug,
            title: stage.title,
            slug: stage.slug,
            description: stage.description ?? null,
            status: stage.status ?? null,
        }),
    );

    return sections.map((section) => {
        if (section._type !== 'expertiseSequence') return section;
        const row = section as PageSectionExpertiseSequenceDoc;
        const stages = row.stages ?? [];
        if (!shouldInheritSectionList(row.listSource, stages)) return section;
        return {...row, stages: fallback};
    });
}

/**
 * Map `expertiseSequence` on a stage page → the lifecycle path ("Where this
 * fits"): every stage in order, the current one marked, previous/next links to
 * the neighbouring released stages.
 */
export function mapExpertiseLifecycle(
    section: PageSectionExpertiseSequenceDoc,
    currentSlug: string,
): ExpertiseLifecycleContent | null {
    const steps: StagePathStep[] = [];
    for (const stage of section.stages ?? []) {
        const title = stage?.title?.trim();
        const slug = stage?.slug?.trim();
        if (!title || !slug) continue;
        const current = slug === currentSlug;
        const comingSoon = stage.status === 'coming-soon';
        steps.push({
            id: slug,
            title,
            current,
            comingSoon,
            ...(!current && !comingSoon ? {href: expertiseHref(slug)} : {}),
        });
    }
    if (steps.length === 0) return null;

    const currentIndex = steps.findIndex((step) => step.current);
    const neighbour = (from: number, step: 1 | -1) => {
        if (currentIndex < 0) return undefined;
        for (let i = from + step; i >= 0 && i < steps.length; i += step) {
            const candidate = steps[i];
            if (candidate?.href) return candidate;
        }
        return undefined;
    };
    const previous = neighbour(currentIndex, -1);
    const next = neighbour(currentIndex, 1);

    const chrome = mapSectionChrome(section);
    const heading = section.heading?.trim();
    const intro = section.intro?.trim();

    return {
        ...(chrome.eyebrow ? {eyebrow: chrome.eyebrow} : {}),
        ...(heading ? {heading} : {}),
        ...(intro ? {intro} : {}),
        steps,
        ...(previous?.href
            ? {previous: {label: `Previous: ${previous.title}`, href: previous.href}}
            : {}),
        ...(next?.href
            ? {next: {label: `Next: ${next.title}`, href: next.href}}
            : {}),
        align: chrome.align,
        borderTop: chrome.borderTop,
        borderBottom: chrome.borderBottom,
    };
}
