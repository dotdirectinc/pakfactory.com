import type {
    SolutionHeroContent,
    SolutionLandingContent,
    SolutionPage,
} from '@/lib/solutions/types';
import {MOCK_SOLUTION_PRODUCT_TILES} from '@/lib/solutions/fixtures/mock-solution-products';
import {WWW_ROUTES} from '@/lib/www-routes';

export {
    BEAUTY_COSMETICS_SLUG,
    beautyCosmeticsSolutionPage,
    isBeautyCosmeticsSlug,
} from '@/lib/solutions/fixtures/beauty-cosmetics';

/**
 * Build Industry LP hero props from a Sanity-backed (or minimal) SolutionPage.
 * Gallery tiles are mock solution products until CMS refs exist.
 */
export function buildSolutionHeroContent(
    page: SolutionPage,
): SolutionHeroContent {
    const hasFeatured = Boolean(page.featuredImageUrl);
    const kitMark = {
        src: page.featuredImageUrl ?? '/solutions/hero-kit-placeholder.svg',
        alt: hasFeatured
            ? page.featuredImageAlt || page.h1
            : `${page.h1} kit mark placeholder`,
    };

    return {
        h1Lead: page.h1,
        rotatingWords: [],
        subtitle: page.descriptionText.trim(),
        cta: {
            label: `Explore all ${page.shortName} Solutions`,
            href: '#inspirations',
        },
        secondaryCta: {
            label: 'Get a quote',
            href: WWW_ROUTES.request,
        },
        kitMark,
        tiles: MOCK_SOLUTION_PRODUCT_TILES,
    };
}

/**
 * Assemble landing content. Hero always from the page; other bands null until later forks.
 */
export function buildSolutionLandingContent(
    solution: SolutionPage,
    bands?: Partial<Omit<SolutionLandingContent, 'solution'>> | null,
): SolutionLandingContent {
    const empty = emptyLandingBands(solution);
    const defaultHero = buildSolutionHeroContent(solution);

    return {
        solution,
        hero: bands?.hero !== undefined ? bands.hero : defaultHero,
        logos: bands?.logos !== undefined ? bands.logos : empty.logos,
        inspirations:
            bands?.inspirations !== undefined
                ? bands.inspirations
                : empty.inspirations,
        customizations:
            bands?.customizations !== undefined
                ? bands.customizations
                : empty.customizations,
        expertise:
            bands?.expertise !== undefined ? bands.expertise : empty.expertise,
        caseStudies:
            bands?.caseStudies !== undefined
                ? bands.caseStudies
                : empty.caseStudies,
        testimonials:
            bands?.testimonials !== undefined
                ? bands.testimonials
                : empty.testimonials,
        faqs: bands?.faqs !== undefined ? bands.faqs : empty.faqs,
    };
}

function emptyLandingBands(solution: SolutionPage): SolutionLandingContent {
    return {
        solution,
        hero: null,
        logos: null,
        inspirations: null,
        customizations: null,
        expertise: null,
        caseStudies: null,
        testimonials: null,
        faqs: null,
    };
}
