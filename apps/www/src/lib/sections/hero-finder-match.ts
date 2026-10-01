import type {
    HeroFinderGeneralEntry,
    HeroFinderGeneralRail,
    HeroFinderIndustry,
    HeroFinderLine,
    HeroFinderStudy,
} from '@/lib/sections/map-hero';
import {productStyleHref, WWW_ROUTES} from '@/lib/www-routes';

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
    return pickFinderStudies(line, industry, curatedLines, 1)[0] ?? null;
}

/**
 * Up to `limit` relative case studies for the active pair (Specific deck).
 * Prefer true line×industry matches, then industry-only, then line-only.
 */
export function pickFinderStudies(
    line: HeroFinderLine,
    industry: HeroFinderIndustry,
    curatedLines: HeroFinderLine[] = [],
    limit = 3,
): HeroFinderStudy[] {
    const out: HeroFinderStudy[] = [];
    const seen = new Set<string>();
    const push = (study: HeroFinderStudy | null | undefined) => {
        if (!study || seen.has(study.id) || out.length >= limit) return;
        seen.add(study.id);
        out.push(study);
    };

    if (isFinderIndustrySentinel(industry)) {
        if (!isFinderLineSentinel(line)) {
            for (const study of line.studies) push(study);
            return out;
        }
        for (const curated of curatedLines) {
            if (isFinderLineSentinel(curated)) continue;
            for (const study of curated.studies) push(study);
            if (out.length >= limit) break;
        }
        return out;
    }

    if (isFinderLineSentinel(line)) {
        for (const study of industry.studies) push(study);
        return out;
    }

    for (const study of industry.studies) {
        if (study.lineIds.includes(line.id)) push(study);
    }
    for (const study of industry.studies) push(study);
    for (const study of line.studies) push(study);
    return out;
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
    /** Ambient MP4 — featured/hover plays; peers stay on still. */
    videoSrc?: string;
    link?: {label: string; href: string};
    stat?: {value: string; label?: string};
};

const BUCKET_CAP = 3;

function shuffleInPlace<T>(items: T[]): T[] {
    const next = [...items];
    for (let i = next.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const tmp = next[i]!;
        next[i] = next[j]!;
        next[j] = tmp;
    }
    return next;
}

function orderBucket(
    entries: HeroFinderGeneralEntry[],
    railOrder: HeroFinderGeneralRail['railOrder'],
): HeroFinderGeneralEntry[] {
    const capped = entries.slice(0, BUCKET_CAP);
    return railOrder === 'random' ? shuffleInPlace(capped) : capped;
}

function entryToSlide(entry: HeroFinderGeneralEntry): FinderSlide {
    return {
        id: `general-${entry.kindLabel.toLowerCase().replace(/\s+/g, '-')}-${entry.id}`,
        kindLabel: entry.kindLabel,
        title: entry.title,
        description: entry.description,
        image: entry.image,
        imageFit: entry.imageFit,
        ...(entry.videoSrc ? {videoSrc: entry.videoSrc} : {}),
        link: entry.link,
    };
}

/** General deck — Studio buckets when Packaging Solution × All. */
export function buildFinderGeneralSlides(
    generalRail: HeroFinderGeneralRail,
): FinderSlide[] {
    const slides: FinderSlide[] = [];
    const seen = new Set<string>();
    const push = (slide: FinderSlide | null) => {
        if (!slide || seen.has(slide.id)) return;
        seen.add(slide.id);
        slides.push(slide);
    };

    const order = generalRail.railOrder;
    for (const entry of orderBucket(generalRail.products, order)) {
        push(entryToSlide(entry));
    }
    for (const entry of orderBucket(generalRail.industries, order)) {
        push(entryToSlide(entry));
    }
    for (const entry of orderBucket(generalRail.customizations, order)) {
        push(entryToSlide(entry));
    }
    for (const entry of orderBucket(generalRail.expertise, order)) {
        push(entryToSlide(entry));
    }
    for (const entry of orderBucket(generalRail.caseStudies, order)) {
        push(entryToSlide(entry));
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
        ...(line.videoSrc ? {videoSrc: line.videoSrc} : {}),
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

function styleToSlide(
    line: HeroFinderLine,
    style: NonNullable<HeroFinderLine['styles']>[number],
): FinderSlide {
    return {
        id: `style-${style.id}`,
        kindLabel: 'Product',
        title: style.title,
        description: style.description,
        image: style.image,
        imageFit: 'contain',
        ...(style.videoSrc ? {videoSrc: style.videoSrc} : {}),
        link: {
            label: 'View style',
            href: productStyleHref(line.slug, style.slug),
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
        description: study.summary,
        image: study.image,
        imageFit: 'cover',
        ...(study.videoSrc ? {videoSrc: study.videoSrc} : {}),
        link: {label: 'Read case study', href: study.href},
    };
}

/**
 * Specific deck — relatedness rules when either picker leaves the sentinel.
 * Order: Products → Industry → Customization → Expertise → Case studies.
 * Customization has no catalogue join today — General list as-is.
 * Expertise always from General defaults.
 */
export function buildFinderSpecificSlides({
    line,
    industry,
    curatedLines,
    curatedIndustries,
    generalRail,
}: {
    line: HeroFinderLine;
    industry: HeroFinderIndustry;
    curatedLines: HeroFinderLine[];
    curatedIndustries: HeroFinderIndustry[];
    generalRail?: HeroFinderGeneralRail;
}): FinderSlide[] {
    const slides: FinderSlide[] = [];
    const seen = new Set<string>();
    const push = (slide: FinderSlide | null) => {
        if (!slide || seen.has(slide.id) || slides.length >= 15) return;
        // Cap is soft; per-bucket caps below keep the rail small.
        seen.add(slide.id);
        slides.push(slide);
    };

    const pushBucket = (bucket: FinderSlide[]) => {
        for (const slide of bucket.slice(0, BUCKET_CAP)) push(slide);
    };

    // Products — up to 3 styles on a specific line.
    if (!isFinderLineSentinel(line)) {
        const styles = (line.styles ?? []).slice(0, BUCKET_CAP);
        if (styles.length > 0) {
            pushBucket(styles.map((style) => styleToSlide(line, style)));
        } else {
            pushBucket([lineToSlide(line)]);
        }
    }

    // Industry — selected industry and/or General industries with a line match.
    const industrySlides: FinderSlide[] = [];
    if (!isFinderIndustrySentinel(industry)) {
        industrySlides.push(industryToSlide(industry));
    }
    const generalIndustryIds = new Set(
        (generalRail?.industries ?? []).map((entry) => entry.id),
    );
    const industryPool =
        generalIndustryIds.size > 0
            ? curatedIndustries.filter((item) => generalIndustryIds.has(item.id))
            : curatedIndustries;
    if (!isFinderLineSentinel(line)) {
        for (const candidate of rankIndustriesForLine(industryPool, line.id)) {
            if (candidate.id === industry.id) continue;
            if (!industryHasLineMatch(candidate, line.id)) continue;
            industrySlides.push(industryToSlide(candidate));
        }
    } else if (isFinderIndustrySentinel(industry)) {
        for (const candidate of industryPool) {
            industrySlides.push(industryToSlide(candidate));
        }
    }
    pushBucket(industrySlides);

    // Customization — General list as-is (no line/industry join on catalogue).
    pushBucket((generalRail?.customizations ?? []).map(entryToSlide));

    // Expertise — always General defaults.
    pushBucket((generalRail?.expertise ?? []).map(entryToSlide));

    // Case studies — up to 3 relative; prefer General pool membership first.
    const relative = pickFinderStudies(line, industry, curatedLines, BUCKET_CAP);
    const generalStudyIds = new Set(
        (generalRail?.caseStudies ?? []).map((entry) => entry.id),
    );
    const preferred = relative.filter((study) => generalStudyIds.has(study.id));
    const rest = relative.filter((study) => !generalStudyIds.has(study.id));
    const studies = [...preferred, ...rest].slice(0, BUCKET_CAP);
    const studySlides: FinderSlide[] = studies.map((study) => {
        const kind = finderFeatureKind(line, industry, study);
        return studyToSlide(study, FINDER_FEATURE_KIND_LABEL[kind]);
    });
    const studyIds = new Set(studies.map((study) => study.id));
    if (studySlides.length < BUCKET_CAP && generalRail) {
        for (const entry of generalRail.caseStudies) {
            if (studySlides.length >= BUCKET_CAP) break;
            if (studyIds.has(entry.id)) continue;
            studyIds.add(entry.id);
            studySlides.push(entryToSlide(entry));
        }
    }
    pushBucket(studySlides);

    return slides;
}

/**
 * Modular Finder rail for the current line × industry picks.
 * Packaging Solution × All → Studio General buckets; otherwise Specific rules.
 */
export function buildFinderSlides({
    line,
    industry,
    curatedLines,
    curatedIndustries,
    generalRail,
}: {
    line: HeroFinderLine;
    industry: HeroFinderIndustry;
    curatedLines: HeroFinderLine[];
    curatedIndustries: HeroFinderIndustry[];
    generalRail?: HeroFinderGeneralRail;
}): FinderSlide[] {
    if (isFinderLineSentinel(line) && isFinderIndustrySentinel(industry)) {
        if (generalRail) return buildFinderGeneralSlides(generalRail);
        // Empty General buckets — fall back to a minimal Specific-style fill
        // so the rail is not blank before editors curate.
        return buildFinderSpecificSlides({
            line,
            industry,
            curatedLines,
            curatedIndustries,
            generalRail,
        });
    }

    return buildFinderSpecificSlides({
        line,
        industry,
        curatedLines,
        curatedIndustries,
        generalRail,
    });
}
