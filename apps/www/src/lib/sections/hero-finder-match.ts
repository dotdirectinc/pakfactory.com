import type {
    HeroFinderIndustry,
    HeroFinderLine,
    HeroFinderStudy,
} from '@/lib/sections/map-hero';
import {WWW_ROUTES} from '@/lib/www-routes';

/** Synthetic line picker default — not a Sanity document. */
export const FINDER_LINE_SENTINEL_SLUG = 'packaging-solution';
export const FINDER_LINE_SENTINEL_ID = 'finder-line:packaging-solution';

/** Synthetic industry picker default — not a Sanity document. */
export const FINDER_INDUSTRY_SENTINEL_SLUG = 'all';
export const FINDER_INDUSTRY_SENTINEL_ID = 'finder-industry:all';

export function packagingSolutionLine(): HeroFinderLine {
    return {
        id: FINDER_LINE_SENTINEL_ID,
        slug: FINDER_LINE_SENTINEL_SLUG,
        title: 'Packaging Solution',
        href: WWW_ROUTES.products,
        description: 'Styles, specs and options across our product lines.',
        studies: [],
    };
}

export function allIndustriesOption(): HeroFinderIndustry {
    return {
        id: FINDER_INDUSTRY_SENTINEL_ID,
        slug: FINDER_INDUSTRY_SENTINEL_SLUG,
        title: 'All',
        href: WWW_ROUTES.solutions,
        description: 'Industries we package for.',
        studies: [],
    };
}

export function isFinderLineSentinel(line: Pick<HeroFinderLine, 'id' | 'slug'>): boolean {
    return (
        line.id === FINDER_LINE_SENTINEL_ID ||
        line.slug === FINDER_LINE_SENTINEL_SLUG
    );
}

export function isFinderIndustrySentinel(
    industry: Pick<HeroFinderIndustry, 'id' | 'slug'>,
): boolean {
    return (
        industry.id === FINDER_INDUSTRY_SENTINEL_ID ||
        industry.slug === FINDER_INDUSTRY_SENTINEL_SLUG
    );
}

/**
 * Prepend Packaging Solution / All. Curated items that reuse those slugs are
 * dropped so the sentinel always owns the first slot.
 */
export function withFinderSentinels(
    lines: HeroFinderLine[],
    industries: HeroFinderIndustry[],
): {lines: HeroFinderLine[]; industries: HeroFinderIndustry[]} {
    const curatedLines = lines.filter((item) => !isFinderLineSentinel(item));
    const curatedIndustries = industries.filter(
        (item) => !isFinderIndustrySentinel(item),
    );
    return {
        lines: [packagingSolutionLine(), ...curatedLines],
        industries: [allIndustriesOption(), ...curatedIndustries],
    };
}

/**
 * Finder hero (PROD-2666): the case study for a line × industry pair, derived —
 * editors never author pairs.
 *
 * With sentinels:
 * - Packaging Solution × All → first study among curated lines (editor order)
 * - Specific line × All → that line’s newest study
 * - Packaging Solution × industry → industry’s first related study
 * - Specific × specific → industry+line match, else industry first, else line first
 */
export function pickFinderStudy(
    line: HeroFinderLine,
    industry: HeroFinderIndustry,
    curatedLines: HeroFinderLine[] = [],
): HeroFinderStudy | null {
    if (isFinderIndustrySentinel(industry)) {
        if (!isFinderLineSentinel(line)) {
            return line.studies[0] ?? null;
        }
        for (const curated of curatedLines) {
            if (isFinderLineSentinel(curated)) continue;
            if (curated.studies[0]) return curated.studies[0];
        }
        return null;
    }

    if (isFinderLineSentinel(line)) {
        return industry.studies[0] ?? null;
    }

    return (
        industry.studies.find((study) => study.lineIds.includes(line.id)) ??
        industry.studies[0] ??
        line.studies[0] ??
        null
    );
}

/** True when the industry has a related study whose products include the line. */
export function industryHasLineMatch(
    industry: HeroFinderIndustry,
    lineId: string,
): boolean {
    if (
        !lineId ||
        lineId === FINDER_LINE_SENTINEL_ID ||
        isFinderIndustrySentinel(industry)
    ) {
        return false;
    }
    return industry.studies.some((study) => study.lineIds.includes(lineId));
}

/**
 * Industries with a true line match first; relative order otherwise preserved.
 * Callers should pin the All sentinel separately — this ranks curated only.
 */
export function rankIndustriesForLine(
    industries: HeroFinderIndustry[],
    lineId: string,
): HeroFinderIndustry[] {
    const matched: HeroFinderIndustry[] = [];
    const rest: HeroFinderIndustry[] = [];
    for (const industry of industries) {
        if (isFinderIndustrySentinel(industry)) {
            rest.push(industry);
            continue;
        }
        if (industryHasLineMatch(industry, lineId)) matched.push(industry);
        else rest.push(industry);
    }
    return [...matched, ...rest];
}

/**
 * Rank curated industries for the line, keeping All (if present) pinned first.
 */
export function rankIndustriesWithAllFirst(
    industries: HeroFinderIndustry[],
    lineId: string,
): HeroFinderIndustry[] {
    const all = industries.find(isFinderIndustrySentinel);
    const curated = industries.filter((item) => !isFinderIndustrySentinel(item));
    const ranked = rankIndustriesForLine(curated, lineId);
    return all ? [all, ...ranked] : ranked;
}

/** Caption kind for the feature card — reflects how well the pair matched. */
export type FinderFeatureKind = 'caseStudy' | 'related' | 'industry';

export function finderFeatureKind(
    line: HeroFinderLine,
    industry: HeroFinderIndustry,
    study: HeroFinderStudy | null,
): FinderFeatureKind {
    if (!study) return 'industry';
    if (isFinderIndustrySentinel(industry) || isFinderLineSentinel(line)) {
        return 'related';
    }
    if (
        industry.studies.some(
            (item) => item.id === study.id && item.lineIds.includes(line.id),
        )
    ) {
        return 'caseStudy';
    }
    return 'related';
}

export const FINDER_FEATURE_KIND_LABEL: Record<FinderFeatureKind, string> = {
    caseStudy: 'Case study',
    related: 'Related',
    industry: 'Industry',
};

/** One slide in the Finder SectionCarousel rail. */
export type FinderSlide = {
    id: string;
    kindLabel: string;
    title: string;
    description?: string;
    image?: HeroFinderLine['image'];
    imageFit: 'contain' | 'cover';
    link?: {label: string; href: string};
    stat?: {value: string; label?: string};
};

const MAX_FINDER_SLIDES = 8;

/**
 * Modular Finder rail for the current line × industry picks. Enough slides to
 * demo the carousel; order prefers the active pair, then curated neighbours.
 */
export function buildFinderSlides({
    line,
    industry,
    curatedLines,
    curatedIndustries,
}: {
    line: HeroFinderLine;
    industry: HeroFinderIndustry;
    curatedLines: HeroFinderLine[];
    curatedIndustries: HeroFinderIndustry[];
}): FinderSlide[] {
    const slides: FinderSlide[] = [];
    const seen = new Set<string>();

    const push = (slide: FinderSlide | null) => {
        if (!slide || seen.has(slide.id) || slides.length >= MAX_FINDER_SLIDES) {
            return;
        }
        seen.add(slide.id);
        slides.push(slide);
    };

    const study = pickFinderStudy(line, industry, curatedLines);
    const featureKind = finderFeatureKind(line, industry, study);

    // 1. Active product line (sentinel or curated).
    push(lineToSlide(line));

    // 2. Matched / related feature for the pair.
    if (study) {
        push(studyToSlide(study, FINDER_FEATURE_KIND_LABEL[featureKind]));
    } else {
        push(industryToSlide(industry));
    }

    // 3. Fill the rail from curated catalogue so the carousel is scrollable.
    if (isFinderLineSentinel(line)) {
        for (const curated of curatedLines) {
            push(lineToSlide(curated));
            if (curated.studies[0]) {
                push(studyToSlide(curated.studies[0], 'Related'));
            }
        }
    } else {
        for (const extra of line.studies.slice(1)) {
            push(studyToSlide(extra, 'Related'));
        }
        for (const curated of curatedLines) {
            if (curated.id === line.id) continue;
            push(lineToSlide(curated));
        }
    }

    if (isFinderIndustrySentinel(industry)) {
        for (const curated of curatedIndustries) {
            push(industryToSlide(curated));
        }
    } else {
        for (const extra of industry.studies) {
            push(
                studyToSlide(
                    extra,
                    extra.lineIds.includes(line.id) ? 'Case study' : 'Related',
                ),
            );
        }
        for (const curated of curatedIndustries) {
            if (curated.id === industry.id) continue;
            push(industryToSlide(curated));
        }
    }

    return slides;
}

function lineToSlide(line: HeroFinderLine): FinderSlide {
    return {
        id: `line-${line.id}`,
        kindLabel: 'Product line',
        title: line.title,
        description: line.description,
        image: line.image,
        imageFit: 'contain',
        link: {
            label: isFinderLineSentinel(line)
                ? 'Browse products'
                : `Explore ${line.title.toLowerCase()}`,
            href: line.href,
        },
    };
}

function industryToSlide(industry: HeroFinderIndustry): FinderSlide {
    return {
        id: `industry-${industry.id}`,
        kindLabel: 'Industry',
        title: industry.title,
        description: industry.description,
        image: industry.image,
        imageFit: 'cover',
        link: {
            label: isFinderIndustrySentinel(industry)
                ? 'See industries'
                : `See ${industry.title} packaging`,
            href: industry.href,
        },
    };
}

function studyToSlide(
    study: HeroFinderStudy,
    kindLabel: string,
): FinderSlide {
    return {
        id: `study-${study.id}`,
        kindLabel,
        title: study.title,
        description: study.clientName,
        image: study.image,
        imageFit: 'cover',
        link: {label: 'Read case study', href: study.href},
        ...(study.stat ? {stat: study.stat} : {}),
    };
}
