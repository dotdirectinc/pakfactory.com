import type {
    PageSectionHeroFinderDoc,
    PageSectionHeroFinderRailEntryDoc,
    PageSectionHeroFinderRailItemDoc,
} from '@pakfactory/sanity/queries';

import {KIND, kindCta, kindLabel, resolveKind} from '@/lib/i18n/kind';
import {resolveSectionLinkHref} from '@/lib/resolve-www-nav-href';
import {
    type FinderSlide,
    isFinderIndustrySentinel,
    isFinderLineSentinel,
    pickFinderStudy,
} from '@/lib/sections/hero-finder-match';
import type {
    HeroFinderIndustry,
    HeroFinderLine,
    HeroFinderStudy,
    HeroImage,
} from '@/lib/sections/map-hero';
import {BLOG_URL} from '@/lib/www-nav';
import {
    expertiseHref,
    productHref,
    productStyleHref,
    solutionHref,
    WWW_ROUTES,
} from '@/lib/www-routes';

export type FinderFullscreenSlide = FinderSlide & {
    /** Category label for inactive rail text. */
    kindLabel: string;
    /** Playable muted-loop BG URL (upload/CDN). Prefer over still when set. */
    videoSrc?: string;
};

function trimmed(value: string | null | undefined): string | undefined {
    const next = value?.trim();
    return next ? next : undefined;
}

function imageFrom(
    src: string | null | undefined,
    alt: string | null | undefined,
    fallbackAlt: string,
): HeroImage | undefined {
    const imageSrc = trimmed(src);
    if (!imageSrc) return undefined;
    return {src: imageSrc, alt: trimmed(alt) || fallbackAlt};
}

function hrefForRailItem(item: PageSectionHeroFinderRailItemDoc): string | undefined {
    const slug = trimmed(item.slug);
    const type = trimmed(item._type);
    if (!slug || !type) return undefined;
    switch (type) {
        case 'productLine':
            return productHref(slug);
        case 'solution':
            return solutionHref(slug);
        case 'expertiseStage':
            return expertiseHref(slug);
        case 'customizationType':
            return WWW_ROUTES.customizations;
        case 'caseStudy':
            return `${WWW_ROUTES.caseStudies}/${slug}`;
        case 'post':
            return `${BLOG_URL}/${slug}`;
        default:
            return undefined;
    }
}

function defaultLinkLabel(
    item: PageSectionHeroFinderRailItemDoc | null | undefined,
): string {
    const type = trimmed(item?._type);
    if (type === 'post') return 'Read article';
    if (!item) return 'Learn more';
    return kindCta(
        resolveKind({
            docType: type,
            productKind: trimmed(item.kind),
        }),
    );
}

/**
 * Map one flexible default-rail entry → slide. Skips incomplete rows.
 */
function slideFromRailEntry(
    entry: PageSectionHeroFinderRailEntryDoc,
    index: number,
): FinderFullscreenSlide | null {
    const kindLabel = trimmed(entry.kindLabel);
    if (!kindLabel) return null;

    const source = trimmed(entry.source) || 'catalogue';
    const item = entry.item ?? null;
    const overrideTitle = trimmed(entry.title);
    const overrideDescription = trimmed(entry.description);

    let title: string | undefined;
    let description: string | undefined;
    let id: string;
    let derivedHref: string | undefined;
    let fallbackImage: HeroImage | undefined;
    let stat: FinderFullscreenSlide['stat'];

    if (source === 'campaign') {
        title = overrideTitle;
        description = overrideDescription;
        if (!title) return null;
        id = `rail-${trimmed(entry._key) || index}-${title}`;
    } else {
        const itemTitle = trimmed(item?.title);
        const itemId = trimmed(item?._id);
        if (!itemTitle || !itemId) return null;
        title = overrideTitle || itemTitle;
        description =
            overrideDescription ||
            trimmed(item?.description) ||
            trimmed(item?.clientName) ||
            undefined;
        id = `rail-${trimmed(entry._key) || index}-${itemId}`;
        derivedHref = hrefForRailItem(item!);
        fallbackImage = imageFrom(item?.imageSrc, item?.imageAlt, title);
        if (trimmed(item?.statTitle)) {
            stat = {
                value: item!.statTitle!,
                ...(trimmed(item?.statBody) ? {label: item!.statBody!} : {}),
            };
        }
    }

    const bannerImage = imageFrom(
        entry.bannerImageSrc,
        entry.bannerImageAlt,
        title,
    );
    const image = bannerImage ?? fallbackImage;
    const videoSrc = trimmed(entry.bannerVideoUrl);

    const customLink = resolveSectionLinkHref(entry.link ?? undefined);
    const linkLabel = trimmed(entry.link?.label) || defaultLinkLabel(item);
    const href = customLink?.href || derivedHref;

    return {
        id,
        kindLabel,
        title,
        description,
        image,
        imageFit: 'cover',
        ...(videoSrc ? {videoSrc} : {}),
        ...(href ? {link: {label: linkLabel, href}} : {}),
        ...(stat ? {stat} : {}),
    };
}

/**
 * General deck for Packaging Solution × All — Studio `defaultRail` array order.
 * Incomplete entries are omitted.
 */
export function buildFinderFullscreenGeneralSlides(
    section: Pick<PageSectionHeroFinderDoc, 'defaultRail'>,
): FinderFullscreenSlide[] {
    const rail = section.defaultRail ?? [];
    const slides: FinderFullscreenSlide[] = [];
    for (let i = 0; i < rail.length; i++) {
        const entry = rail[i];
        if (!entry) continue;
        const slide = slideFromRailEntry(entry, i);
        if (slide) slides.push(slide);
    }
    return slides;
}

function studyToFsSlide(study: HeroFinderStudy): FinderFullscreenSlide {
    const kind = KIND.caseStudy;
    return {
        id: `study-${study.id}`,
        kindLabel: kindLabel(kind),
        title: study.title,
        description: study.clientName,
        image: study.image,
        imageFit: 'cover',
        link: {label: kindCta(kind), href: study.href},
        ...(study.stat ? {stat: study.stat} : {}),
    };
}

/**
 * Specific deck when a real line and/or industry is selected.
 * Order: popular style → industry → case study.
 */
export function buildFinderFullscreenSpecificSlides({
    line,
    industry,
    curatedLines,
}: {
    line: HeroFinderLine;
    industry: HeroFinderIndustry;
    curatedLines: HeroFinderLine[];
}): FinderFullscreenSlide[] {
    const slides: FinderFullscreenSlide[] = [];

    if (!isFinderLineSentinel(line)) {
        const style = line.styles?.[0];
        if (style) {
            const kind = KIND.productStyle;
            slides.push({
                id: `style-${style.id}`,
                kindLabel: kindLabel(kind),
                title: style.title,
                description: style.description,
                image: style.image,
                imageFit: 'cover',
                link: {
                    label: kindCta(kind),
                    href: productStyleHref(line.slug, style.slug),
                },
            });
        } else {
            const kind = KIND.productLine;
            slides.push({
                id: `line-${line.id}`,
                kindLabel: kindLabel(kind),
                title: line.title,
                description: line.description,
                image: line.image,
                imageFit: 'cover',
                link: {
                    label: kindCta(kind),
                    href: line.href,
                },
            });
        }
    }

    if (!isFinderIndustrySentinel(industry)) {
        const kind = KIND.industry;
        slides.push({
            id: `industry-${industry.id}`,
            kindLabel: kindLabel(kind),
            title: industry.title,
            description: industry.description,
            image: industry.image,
            imageFit: 'cover',
            link: {
                label: kindCta(kind),
                href: industry.href,
            },
        });
    }

    const study = pickFinderStudy(line, industry, curatedLines);
    if (study) {
        slides.push(studyToFsSlide(study));
    }

    return slides;
}
