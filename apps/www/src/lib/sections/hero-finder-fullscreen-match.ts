import type {
    PageSectionHeroCaseStudyDoc,
    PageSectionHeroFinderDefaultRailDoc,
    PageSectionHeroFinderDoc,
    PageSectionHeroFinderRailItemDoc,
    PageSectionHeroFinderRailSlotDoc,
} from '@pakfactory/sanity/queries';

import {BLOG_URL} from '@/lib/www-nav';
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
import {resolveSectionLinkHref} from '@/lib/resolve-www-nav-href';
import {
    expertiseHref,
    productHref,
    productStyleHref,
    solutionHref,
    WWW_ROUTES,
} from '@/lib/www-routes';

/** Fixed General offering order (code-locked). */
export const FINDER_FS_GENERAL_ORDER = [
    'product',
    'solution',
    'expertise',
    'customization',
    'caseStudy',
    'blog',
    'promo',
] as const;

export type FinderFsGeneralSlot = (typeof FINDER_FS_GENERAL_ORDER)[number];

const KIND_LABEL: Record<FinderFsGeneralSlot, string> = {
    product: 'Product',
    solution: 'Solution',
    expertise: 'Expertise',
    customization: 'Customization',
    caseStudy: 'Case study',
    blog: 'Blog',
    promo: 'Promo',
};

export type FinderFullscreenSlide = FinderSlide & {
    /** Category label for inactive rail text. */
    kindLabel: string;
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

function slideFromRailItem(
    slot: FinderFsGeneralSlot,
    item: PageSectionHeroFinderRailItemDoc,
): FinderFullscreenSlide | null {
    const title = trimmed(item.title);
    const id = trimmed(item._id);
    if (!title || !id) return null;
    const href = hrefForRailItem(item);
    const image = imageFrom(item.imageSrc, item.imageAlt, title);
    const description =
        trimmed(item.description) || trimmed(item.clientName) || undefined;
    const linkLabel =
        slot === 'caseStudy'
            ? 'Read case study'
            : slot === 'blog'
              ? 'Read article'
              : slot === 'product'
                ? `Explore ${title.toLowerCase()}`
                : slot === 'solution'
                  ? `See ${title} packaging`
                  : 'Learn more';

    return {
        id: `rail-${slot}-${id}`,
        kindLabel: KIND_LABEL[slot],
        title,
        description,
        image,
        imageFit: slot === 'product' || slot === 'customization' ? 'contain' : 'cover',
        ...(href ? {link: {label: linkLabel, href}} : {}),
        ...(trimmed(item.statTitle)
            ? {
                  stat: {
                      value: item.statTitle!,
                      ...(trimmed(item.statBody)
                          ? {label: item.statBody!}
                          : {}),
                  },
              }
            : {}),
    };
}

function slideFromCampaign(
    campaign: NonNullable<PageSectionHeroFinderRailSlotDoc['campaign']>,
): FinderFullscreenSlide | null {
    const title = trimmed(campaign.title);
    if (!title) return null;
    const resolved = resolveSectionLinkHref(campaign.link ?? undefined);
    const image = imageFrom(campaign.imageSrc, campaign.imageAlt, title);
    const description = trimmed(campaign.description);
    const linkLabel = trimmed(campaign.link?.label) || 'Learn more';
    return {
        id: `rail-promo-${title}`,
        kindLabel: KIND_LABEL.promo,
        title,
        description,
        image,
        imageFit: 'cover',
        ...(resolved
            ? {link: {label: linkLabel, href: resolved.href}}
            : {}),
    };
}

function resolveSlotItem(
    slot: FinderFsGeneralSlot,
    railSlot: PageSectionHeroFinderRailSlotDoc | null | undefined,
    autoNewest: PageSectionHeroFinderDoc['autoNewest'],
    autoPopular: PageSectionHeroFinderDoc['autoPopular'],
): PageSectionHeroFinderRailItemDoc | PageSectionHeroCaseStudyDoc | null {
    const mode = trimmed(railSlot?.fillMode) || 'manual';
    if (mode === 'manual') {
        return railSlot?.item ?? null;
    }
    const pool = mode === 'popular' ? autoPopular : autoNewest;
    const fromAuto = pool?.[slot] ?? null;
    if (fromAuto) return fromAuto;
    // Manual ref still set while mode is auto — prefer expanded item.
    return railSlot?.item ?? null;
}

/**
 * General deck for Packaging Solution × All — Studio seats in locked order.
 * Empty / unresolved seats are omitted.
 */
export function buildFinderFullscreenGeneralSlides(
    section: Pick<
        PageSectionHeroFinderDoc,
        'defaultRail' | 'autoNewest' | 'autoPopular'
    >,
): FinderFullscreenSlide[] {
    const rail: PageSectionHeroFinderDefaultRailDoc = section.defaultRail ?? {};
    const slides: FinderFullscreenSlide[] = [];

    for (const slot of FINDER_FS_GENERAL_ORDER) {
        const railSlot = rail[slot];
        if (slot === 'promo') {
            const mode = trimmed(railSlot?.fillMode) || 'manual';
            if (mode === 'manual' && railSlot?.campaign) {
                const slide = slideFromCampaign(railSlot.campaign);
                if (slide) slides.push(slide);
            }
            continue;
        }

        const item = resolveSlotItem(
            slot,
            railSlot,
            section.autoNewest,
            section.autoPopular,
        );
        if (!item) continue;
        const slide = slideFromRailItem(
            slot,
            item as PageSectionHeroFinderRailItemDoc,
        );
        if (slide) slides.push(slide);
    }

    return slides;
}

function studyToFsSlide(study: HeroFinderStudy): FinderFullscreenSlide {
    return {
        id: `study-${study.id}`,
        kindLabel: 'Case study',
        title: study.title,
        description: study.clientName,
        image: study.image,
        imageFit: 'cover',
        link: {label: 'Read case study', href: study.href},
        ...(study.stat ? {stat: study.stat} : {}),
    };
}

/**
 * Specific deck when a real line and/or industry is selected.
 * Order: popular style → industry → case study → (blog/promo omitted until wired).
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
            slides.push({
                id: `style-${style.id}`,
                kindLabel: 'Product style',
                title: style.title,
                description: style.description,
                image: style.image,
                imageFit: 'contain',
                link: {
                    label: 'View style',
                    href: productStyleHref(line.slug, style.slug),
                },
            });
        } else {
            slides.push({
                id: `line-${line.id}`,
                kindLabel: 'Product',
                title: line.title,
                description: line.description,
                image: line.image,
                imageFit: 'contain',
                link: {
                    label: `Explore ${line.title.toLowerCase()}`,
                    href: line.href,
                },
            });
        }
    }

    if (!isFinderIndustrySentinel(industry)) {
        slides.push({
            id: `industry-${industry.id}`,
            kindLabel: 'Industry',
            title: industry.title,
            description: industry.description,
            image: industry.image,
            imageFit: 'cover',
            link: {
                label: `See ${industry.title} packaging`,
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
