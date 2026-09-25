import type {PageSectionInspirationsGridDoc} from '@pakfactory/sanity/queries';

import type {WorkShowcaseContent} from '@/components/sections/work-showcase';
import {mapInspirationsGrid} from '@/lib/sections/map-inspirations-grid';

const CASE_STUDY_PATH = /^\/case-studies\/[^/]+/;

/**
 * Map an `inspirationsGrid` on an expertise stage page → WorkShowcase props:
 * cards that link to a case study form the large stepping row; every other card
 * (work / product shots) forms the gliding row under it. No case-study cards →
 * null (the host falls back to the regular gallery).
 */
export function mapWorkShowcase(
    section: PageSectionInspirationsGridDoc,
): WorkShowcaseContent | null {
    const gallery = mapInspirationsGrid(section);
    const toCard = (card: (typeof gallery.cards)[number]) => ({
        id: card.id,
        title: card.title,
        ...(card.description ? {description: card.description} : {}),
        image: {src: card.image.src, alt: card.image.alt || card.title},
        href: card.href,
    });
    const withImage = gallery.cards.filter((card) => card.image?.src);
    const cases = withImage.filter((card) => CASE_STUDY_PATH.test(card.href)).map(toCard);
    const works = withImage.filter((card) => !CASE_STUDY_PATH.test(card.href)).map(toCard);
    if (cases.length === 0) return null;
    return {
        ...(gallery.eyebrow ? {eyebrow: gallery.eyebrow} : {}),
        heading: gallery.headline,
        ...(gallery.description ? {intro: gallery.description} : {}),
        ...(gallery.align ? {align: gallery.align} : {}),
        cases,
        works,
    };
}
