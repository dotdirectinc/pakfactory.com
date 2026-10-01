import type {
    PageSectionHeroCaseStudyDoc,
    PageSectionHeroCopyFields,
    PageSectionHeroCtaDoc,
    PageSectionHeroFinderDoc,
    PageSectionHeroSpotlightDoc,
    PageSectionHeroSpotlightSlideDoc,
    PageSectionLinkDoc,
} from '@pakfactory/sanity/queries';
import {isCatalogTargetVisible} from '@pakfactory/sanity/catalog-visibility';
import {stegaClean} from 'next-sanity';

import {resolveSectionLinkHref} from '@/lib/resolve-www-nav-href';
import {buildFinderFullscreenGeneralSlides} from '@/lib/sections/hero-finder-fullscreen-match';
import type {FinderFullscreenSlide} from '@/lib/sections/hero-finder-fullscreen-match';
import {
    productHref,
    productStyleHref,
    solutionHref,
    WWW_ROUTES,
} from '@/lib/www-routes';

/**
 * Map the Home hero sections (PROD-2666) → props for `HeroSpotlight`,
 * `HeroSpotlightFullBleed` and `HeroFinder`. Catalogue targets that are hidden
 * on the site (coming-soon lines, solutions without a page) are dropped here,
 * using the shared `isCatalogTargetVisible` mirror — never a local matrix.
 */

export type HeroCta = {label: string; href: string; note?: string};

export type HeroImage = {src: string; alt: string};

export type HeroCopyContent = {
    eyebrow?: string;
    intro?: string;
    primaryCta?: HeroCta;
    secondaryCta?: HeroCta;
    showReviews: boolean;
};

export type HeroSlideKind =
    | 'caseStudy'
    | 'productLine'
    | 'productStyle'
    | 'solution'
    | 'campaign';

export type HeroSlide = {
    id: string;
    kind: HeroSlideKind;
    /** Pager + caption label for the slide type (e.g. "Case study"). */
    kindLabel: string;
    /** Short pager label (client name, line name, …). */
    label: string;
    title: string;
    description?: string;
    image: HeroImage;
    /** Muted loop for case-study slides (`previewVideo`). */
    videoSrc?: string;
    /** Product cut-outs sit on a muted well; photos fill the stage. */
    imageFit: 'cover' | 'contain';
    stat?: {value: string; label?: string};
    chips: string[];
    link?: {label: string; href: string};
};

export type HeroSpotlightContent = HeroCopyContent & {
    heading: string;
    slides: HeroSlide[];
};

export type HeroFinderStudy = {
    id: string;
    title: string;
    href: string;
    clientName?: string;
    image: HeroImage;
    stat?: {value: string; label?: string};
    lineIds: string[];
};

export type HeroFinderLine = {
    id: string;
    /** Document slug — shareable `?line=` value. */
    slug: string;
    title: string;
    description?: string;
    href: string;
    image?: HeroImage;
    studies: HeroFinderStudy[];
    /** Popular / recent styles on the line (fullscreen Specific rail). */
    styles?: {
        id: string;
        title: string;
        slug: string;
        description?: string;
        image?: HeroImage;
    }[];
};

export type HeroFinderIndustry = {
    id: string;
    /** Document slug — shareable `?industry=` value. */
    slug: string;
    title: string;
    description?: string;
    href: string;
    image?: HeroImage;
    studies: HeroFinderStudy[];
};

export type HeroFinderContent = HeroCopyContent & {
    headingLead: string;
    headingJoin: string;
    headingTrail?: string;
    lines: HeroFinderLine[];
    industries: HeroFinderIndustry[];
};

/** Fullscreen Finder — same pickers plus pre-built General deck from Studio seats. */
export type HeroFinderFullscreenContent = HeroFinderContent & {
    generalSlides: FinderFullscreenSlide[];
};

const KIND_LABEL: Record<HeroSlideKind, string> = {
    caseStudy: 'Case study',
    productLine: 'Product line',
    productStyle: 'Product style',
    solution: 'Industry',
    campaign: 'Featured',
};

function trimmed(value: string | null | undefined): string | undefined {
    const next = value?.trim();
    return next ? next : undefined;
}

/** Enum-like strings arrive stega-encoded in draft mode — clean before comparing. */
function clean(value: string | null | undefined): string | undefined {
    const next = stegaClean(value ?? undefined);
    return typeof next === 'string' && next.trim() ? next.trim() : undefined;
}

function resolveLink(
    link: PageSectionLinkDoc | PageSectionHeroCtaDoc | null | undefined,
): string | null {
    if (!link) return null;
    return (
        resolveSectionLinkHref({...link, linkType: clean(link.linkType)})
            ?.href ?? null
    );
}

function mapCta(cta: PageSectionHeroCtaDoc | null | undefined): HeroCta | undefined {
    const label = trimmed(cta?.label);
    if (!label) return undefined;
    const href = resolveLink(cta);
    if (!href) return undefined;
    const note = trimmed(cta?.note);
    return {label, href, ...(note ? {note} : {})};
}

function mapCopy(section: PageSectionHeroCopyFields): HeroCopyContent {
    const eyebrow = trimmed(section.eyebrow);
    const intro = trimmed(section.intro);
    const primaryCta = mapCta(section.primaryCta);
    const secondaryCta = mapCta(section.secondaryCta);
    return {
        ...(eyebrow ? {eyebrow} : {}),
        ...(intro ? {intro} : {}),
        ...(primaryCta ? {primaryCta} : {}),
        ...(secondaryCta ? {secondaryCta} : {}),
        // Unset (older docs) counts as on — matches the Studio initial value.
        showReviews: section.showReviews !== false,
    };
}

function mapStat(
    study: PageSectionHeroCaseStudyDoc,
): {value: string; label?: string} | undefined {
    const value = trimmed(study.statTitle);
    if (!value) return undefined;
    const label = trimmed(study.statBody);
    return {value, ...(label ? {label} : {})};
}

function caseStudyHref(slug: string | null | undefined): string | null {
    const next = trimmed(slug);
    return next ? `${WWW_ROUTES.caseStudies}/${next}` : null;
}

function isVisible(slide: PageSectionHeroSpotlightSlideDoc): boolean {
    return isCatalogTargetVisible({
        _type: clean(slide.docType),
        status: clean(slide.status) ?? null,
        customerFacing: slide.customerFacing,
        hasPage: slide.hasPage,
    });
}

function mapSlide(
    slide: PageSectionHeroSpotlightSlideDoc,
    index: number,
): HeroSlide | null {
    const kind = clean(slide.kind) as HeroSlideKind | undefined;
    if (!kind || !(kind in KIND_LABEL)) return null;
    if (kind !== 'campaign' && !isVisible(slide)) return null;

    const title = trimmed(slide.title);
    const imageSrc = trimmed(slide.imageSrc);
    if (!title || !imageSrc) return null;

    const id = trimmed(slide._key) || `${slide._id?.trim() || title}-${index}`;
    const image = {src: imageSrc, alt: trimmed(slide.imageAlt) || title};
    const base = {id, kind, kindLabel: KIND_LABEL[kind], title, image};

    switch (kind) {
        case 'caseStudy': {
            const href = caseStudyHref(slide.slug);
            if (!href) return null;
            const clientName = trimmed(slide.clientName);
            const stat = mapStat(slide);
            const description = trimmed(slide.summary);
            const videoSrc = trimmed(slide.videoSrc);
            return {
                ...base,
                label: clientName || title,
                imageFit: 'cover',
                chips: (slide.chips ?? [])
                    .map((chip) => trimmed(chip))
                    .filter((chip): chip is string => Boolean(chip)),
                link: {label: 'Read case study', href},
                ...(description ? {description} : {}),
                ...(stat ? {stat} : {}),
                ...(videoSrc ? {videoSrc} : {}),
            };
        }
        case 'productLine':
        case 'productStyle': {
            const slug = trimmed(slide.slug);
            const lineSlug = trimmed(slide.lineSlug);
            const href =
                kind === 'productLine'
                    ? slug && productHref(slug)
                    : slug && lineSlug && productStyleHref(lineSlug, slug);
            if (!href) return null;
            const description = trimmed(slide.description);
            return {
                ...base,
                label: title,
                imageFit: 'contain',
                chips: [],
                link: {label: `Explore ${title.toLowerCase()}`, href},
                ...(description ? {description} : {}),
            };
        }
        case 'solution': {
            const slug = trimmed(slide.slug);
            if (!slug) return null;
            const description = trimmed(slide.description);
            return {
                ...base,
                label: title,
                imageFit: 'cover',
                chips: [],
                link: {label: `See ${title} packaging`, href: solutionHref(slug)},
                ...(description ? {description} : {}),
            };
        }
        case 'campaign': {
            const description = trimmed(slide.description);
            const linkLabel = trimmed(slide.link?.label);
            const href = linkLabel ? resolveLink(slide.link) : null;
            return {
                ...base,
                label: title,
                imageFit: 'cover',
                chips: [],
                ...(description ? {description} : {}),
                ...(linkLabel && href ? {link: {label: linkLabel, href}} : {}),
            };
        }
        default:
            return null;
    }
}

/** `heroSpotlight` + `heroSpotlightFullBleed` share one content shape. */
export function mapHeroSpotlight(
    section: PageSectionHeroSpotlightDoc,
): HeroSpotlightContent | null {
    const heading = trimmed(section.heading);
    if (!heading) return null;
    const slides: HeroSlide[] = [];
    for (const [index, row] of (section.spotlight ?? []).entries()) {
        const mapped = mapSlide(row, index);
        if (mapped) slides.push(mapped);
    }
    return {...mapCopy(section), heading, slides};
}

function mapStudy(
    study: PageSectionHeroCaseStudyDoc | null | undefined,
): HeroFinderStudy | null {
    if (!study) return null;
    const id = trimmed(study._id);
    const title = trimmed(study.title);
    const href = caseStudyHref(study.slug);
    const imageSrc = trimmed(study.imageSrc);
    if (!id || !title || !href || !imageSrc) return null;
    const clientName = trimmed(study.clientName);
    const stat = mapStat(study);
    return {
        id,
        title,
        href,
        image: {src: imageSrc, alt: trimmed(study.imageAlt) || title},
        lineIds: (study.lineIds ?? [])
            .map((lineId) => trimmed(lineId))
            .filter((lineId): lineId is string => Boolean(lineId)),
        ...(clientName ? {clientName} : {}),
        ...(stat ? {stat} : {}),
    };
}

function mapStudies(
    studies: (PageSectionHeroCaseStudyDoc | null)[] | null | undefined,
): HeroFinderStudy[] {
    return (studies ?? [])
        .map(mapStudy)
        .filter((study): study is HeroFinderStudy => Boolean(study));
}

/** `heroFinder` — drops hidden lines / page-less industries; needs two of each. */
export function mapHeroFinder(
    section: PageSectionHeroFinderDoc,
): HeroFinderContent | null {
    const headingLead = trimmed(section.headingLead);
    const headingJoin = trimmed(section.headingJoin);
    if (!headingLead || !headingJoin) return null;

    const lines: HeroFinderLine[] = [];
    for (const line of section.productLines ?? []) {
        const id = trimmed(line?._id);
        const title = trimmed(line?.title);
        const slug = trimmed(line?.slug);
        if (!line || !id || !title || !slug) continue;
        if (
            !isCatalogTargetVisible({
                _type: 'productLine',
                status: clean(line.status) ?? null,
                customerFacing: line.customerFacing,
            })
        ) {
            continue;
        }
        const imageSrc = trimmed(line.imageSrc);
        const description = trimmed(line.description);
        const styles = (line.styles ?? [])
            .map((style) => {
                const styleId = trimmed(style?._id);
                const styleTitle = trimmed(style?.title);
                const styleSlug = trimmed(style?.slug);
                if (!styleId || !styleTitle || !styleSlug) return null;
                const styleImageSrc = trimmed(style.imageSrc);
                const styleDescription = trimmed(style.description);
                return {
                    id: styleId,
                    title: styleTitle,
                    slug: styleSlug,
                    ...(styleDescription ? {description: styleDescription} : {}),
                    ...(styleImageSrc
                        ? {
                              image: {
                                  src: styleImageSrc,
                                  alt: trimmed(style.imageAlt) || styleTitle,
                              },
                          }
                        : {}),
                };
            })
            .filter((style): style is NonNullable<typeof style> => Boolean(style));
        lines.push({
            id,
            slug,
            title,
            href: productHref(slug),
            studies: mapStudies(line.studies),
            ...(styles.length > 0 ? {styles} : {}),
            ...(imageSrc
                ? {image: {src: imageSrc, alt: trimmed(line.imageAlt) || title}}
                : {}),
            ...(description ? {description} : {}),
        });
    }

    const industries: HeroFinderIndustry[] = [];
    for (const industry of section.industries ?? []) {
        const id = trimmed(industry?._id);
        const title = trimmed(industry?.title);
        const slug = trimmed(industry?.slug);
        if (!industry || !id || !title || !slug) continue;
        if (industry.hasPage !== true) continue;
        const imageSrc = trimmed(industry.imageSrc);
        const description = trimmed(industry.description);
        industries.push({
            id,
            slug,
            title,
            href: solutionHref(slug),
            studies: mapStudies(industry.studies),
            ...(imageSrc
                ? {
                      image: {
                          src: imageSrc,
                          alt: trimmed(industry.imageAlt) || title,
                      },
                  }
                : {}),
            ...(description ? {description} : {}),
        });
    }

    if (lines.length === 0 || industries.length === 0) return null;

    const headingTrail = trimmed(section.headingTrail);
    return {
        ...mapCopy(section),
        headingLead,
        headingJoin,
        ...(headingTrail ? {headingTrail} : {}),
        lines,
        industries,
    };
}

/** `heroFinderFullscreen` — Finder content + Studio default-rail General deck. */
export function mapHeroFinderFullscreen(
    section: PageSectionHeroFinderDoc,
): HeroFinderFullscreenContent | null {
    if (section._type !== 'heroFinderFullscreen') return null;
    const base = mapHeroFinder(section);
    if (!base) return null;

    return {
        ...base,
        generalSlides: buildFinderFullscreenGeneralSlides(section),
    };
}
