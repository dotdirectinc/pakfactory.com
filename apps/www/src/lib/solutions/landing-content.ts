import type {
    SolutionHeroContent,
    SolutionHeroCustomization,
    SolutionHeroTile,
    SolutionLandingContent,
    SolutionPage,
    PageSection,
} from '@/lib/solutions/types';
import {customizationOptionHref} from '@/lib/catalog/customization-option-href';
import type {CustomizationOption, Product} from '@/lib/catalog/types';
import {
    productHref,
    WWW_ROUTES,
} from '@/lib/www-routes';

/** Desktop hero tile width cycle (matches prior mock layout). */
const TILE_WIDTHS = [401, 312, 349, 347, 334, 270, 270] as const;

function heroCustomizationOptions(
    product: Product,
): CustomizationOption[] {
    const all = product.availableCustomizations ?? [];
    const preselected = all.filter((opt) => opt.preselected);
    return (preselected.length > 0 ? preselected : all).slice(0, 4);
}

function mapCustomizations(
    product: Product,
): SolutionHeroCustomization[] {
    return heroCustomizationOptions(product).map((opt) => {
        const learnMoreHref =
            customizationOptionHref(opt) ?? WWW_ROUTES.customizations;
        const imageSrc = opt.imageUrl?.trim() || null;
        return {
            id: opt.id || opt.slug || opt.label,
            category: (
                opt.categoryTitle ||
                opt.category ||
                'CUSTOMIZATION'
            ).toUpperCase(),
            title: opt.label,
            description:
                opt.shortDescription?.trim() ||
                'Pre-selected on this inspiration product.',
            learnMoreHref,
            ...(imageSrc
                ? {imageSrc, imageAlt: opt.label}
                : {imageSrc: null}),
        };
    });
}

/**
 * Map catalog products → Industry LP hero carousel tiles.
 */
export function productsToHeroTiles(products: Product[]): SolutionHeroTile[] {
    return products.map((product, index) => {
        const media = product.media?.[0];
        const image =
            media?.src?.trim()
                ? {
                      src: media.src.trim(),
                      alt: media.alt?.trim() || product.title,
                  }
                : null;
        const modelSrc = product.model3dUrl?.trim() || '';
        const modelAnimationName = product.model3dAnimationName?.trim() || '';
        return {
            id: product.slug,
            label: product.title,
            title: product.title,
            detailHref: productHref(product.slug),
            width: TILE_WIDTHS[index % TILE_WIDTHS.length],
            ...(image ? {image} : {}),
            ...(modelSrc ? {modelSrc} : {}),
            ...(modelAnimationName ? {modelAnimationName} : {}),
            customizations: mapCustomizations(product),
        };
    });
}

/**
 * Build Industry LP hero props from a Sanity-backed SolutionPage.
 * Tiles come from products tagged to this solution (caller supplies).
 */
export function buildSolutionHeroContent(
    page: SolutionPage,
    heroProducts: Product[] = [],
): SolutionHeroContent {
    const hasFeatured = Boolean(page.featuredImageUrl);
    const featuredIcon = {
        src: page.featuredImageUrl ?? '/solutions/hero-kit-placeholder.svg',
        alt: hasFeatured
            ? page.featuredImageAlt || page.h1
            : `${page.h1} featured icon placeholder`,
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
        featuredIcon,
        tiles: productsToHeroTiles(heroProducts),
    };
}

/**
 * Assemble landing content. Hero from the page + style products; body from CMS sections.
 */
export function buildSolutionLandingContent(
    solution: SolutionPage,
    sections?: PageSection[] | null,
    hero?: SolutionHeroContent | null,
    heroProducts?: Product[] | null,
): SolutionLandingContent {
    const cmsSections = sections?.filter(Boolean) ?? null;
    return {
        solution,
        hero:
            hero !== undefined
                ? hero
                : buildSolutionHeroContent(solution, heroProducts ?? []),
        sections: cmsSections && cmsSections.length > 0 ? cmsSections : null,
    };
}
