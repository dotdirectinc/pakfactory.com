import 'server-only';

import {
    CASE_STUDY_SITEMAP_QUERY,
    type CaseStudySitemapEntry,
} from '@pakfactory/sanity/queries';
import {
    listCustomizations,
    listLineStyleParams,
} from '@/lib/catalog/catalog';
import {listContentPageSitemapEntries} from '@/lib/content-pages';
import {listExpertiseStageSlugs} from '@/lib/expertise/expertise';
import {listNewsSitemapEntries} from '@/lib/newsroom/newsroom';
import {getPublishedSanityClient} from '@/lib/sanity/client';
import {isSanityConfigured} from '@/lib/sanity/env';
import {
    listSolutionPageSlugs,
    listSolutionStylePageParams,
} from '@/lib/solutions/solutions';
import {
    WWW_ROUTES,
    customizationCategoryHref,
    expertiseHref,
    newsItemHref,
    productHref,
    productStyleHref,
    solutionHref,
    solutionStyleHref,
} from '@/lib/www-routes';

export type WwwSitemapLink = {
    href: string;
    label: string;
    lastmod?: string;
};

export type WwwSitemapGroup = {
    title: string;
    links: WwwSitemapLink[];
};

function lastmodIso(value: string | null | undefined): string | undefined {
    if (!value) return undefined;
    try {
        return new Date(value).toISOString().split('T')[0];
    } catch {
        return undefined;
    }
}

/** Prefer a CMS title; fall back to the URL slug when title is empty. */
function titleOrSlug(
    title: string | null | undefined,
    slug: string,
): string {
    const trimmed = title?.trim();
    return trimmed || slug;
}

/**
 * Grouped site URLs for `/sitemap` (HTML) and `/sitemap.xml` (PROD-3235).
 * Category landings are omitted — they 404 (PROD-2848).
 * Link labels use page titles (not slugs) when Sanity provides them.
 */
export async function buildWwwSitemapGroups(): Promise<WwwSitemapGroup[]> {
    const [
        lineParams,
        customizationLibrary,
        solutionSlugs,
        solutionStyleParams,
        expertiseSlugs,
        contentPages,
        caseStudies,
        newsEntries,
    ] = await Promise.all([
        listLineStyleParams().catch(() => []),
        listCustomizations().catch(() => ({items: []})),
        listSolutionPageSlugs().catch(() => []),
        listSolutionStylePageParams().catch(() => []),
        listExpertiseStageSlugs().catch(() => []),
        listContentPageSitemapEntries().catch(() => []),
        isSanityConfigured()
            ? getPublishedSanityClient()
                  .fetch<CaseStudySitemapEntry[]>(CASE_STUDY_SITEMAP_QUERY)
                  .catch(() => [] as CaseStudySitemapEntry[])
            : Promise.resolve([] as CaseStudySitemapEntry[]),
        listNewsSitemapEntries().catch(() => []),
    ]);

    const company: WwwSitemapLink[] = [
        {href: WWW_ROUTES.home, label: 'Home'},
        {href: WWW_ROUTES.about, label: 'About'},
        {href: WWW_ROUTES.contact, label: 'Contact'},
        {href: WWW_ROUTES.policies, label: 'Policies'},
        {href: WWW_ROUTES.privacyPolicy, label: 'Privacy Policy'},
        {href: WWW_ROUTES.termsOfService, label: 'Terms of Service'},
        {href: WWW_ROUTES.cookiesPreference, label: 'Cookies Preference'},
        {href: WWW_ROUTES.sitemap, label: 'Sitemap'},
        ...contentPages.map((entry) => ({
            href: `/${entry.slug}`,
            label: titleOrSlug(entry.title, entry.slug),
            lastmod: lastmodIso(entry.lastmod),
        })),
    ];

    const products: WwwSitemapLink[] = [
        {href: WWW_ROUTES.products, label: 'Products'},
        ...lineParams.flatMap((line) => [
            {
                href: productHref(line.slug),
                label: titleOrSlug(line.title, line.slug),
            },
            ...(line.styles ?? []).map((style) => ({
                href: productStyleHref(line.slug, style.slug),
                label: titleOrSlug(style.title, style.slug),
            })),
        ]),
    ];

    const customizations: WwwSitemapLink[] = [
        {href: WWW_ROUTES.customizations, label: 'Customizations'},
        {
            href: `${WWW_ROUTES.customizations}/compatibility`,
            label: 'Compatibility',
        },
        ...customizationLibrary.items.map((item) => ({
            href: customizationCategoryHref(item.categoryValue, item.slug),
            label: titleOrSlug(item.title, item.slug),
        })),
    ];

    const solutions: WwwSitemapLink[] = [
        {href: WWW_ROUTES.solutions, label: 'Solutions'},
        ...solutionSlugs.map((entry) => ({
            href: solutionHref(entry.slug),
            label: titleOrSlug(entry.title, entry.slug),
        })),
        ...solutionStyleParams.map((entry) => ({
            href: solutionStyleHref(entry.slug, entry.styleSlug),
            label: titleOrSlug(entry.title, entry.styleSlug),
        })),
    ];

    const expertise: WwwSitemapLink[] = [
        {href: WWW_ROUTES.expertise, label: 'Expertise'},
        ...expertiseSlugs
            .map((entry) => {
                const slug = entry.slug?.trim();
                if (!slug) return null;
                return {
                    href: expertiseHref(slug),
                    label: titleOrSlug(entry.title, slug),
                };
            })
            .filter((link): link is WwwSitemapLink => link !== null),
    ];

    const caseStudyLinks: WwwSitemapLink[] = [
        {href: WWW_ROUTES.caseStudies, label: 'Case Studies'},
        ...caseStudies.map((entry) => ({
            href: `${WWW_ROUTES.caseStudies}/${entry.slug}`,
            label: titleOrSlug(entry.title, entry.slug),
            lastmod: lastmodIso(entry.lastmod),
        })),
    ];

    const newsroom: WwwSitemapLink[] = [
        {href: WWW_ROUTES.newsroom, label: 'Newsroom'},
        ...newsEntries.map((entry) => ({
            href: newsItemHref(entry.slug),
            label: titleOrSlug(entry.title, entry.slug),
            lastmod: lastmodIso(entry.lastmod),
        })),
    ];

    return [
        {title: 'Company', links: company},
        {title: 'Products', links: products},
        {title: 'Customizations', links: customizations},
        {title: 'Solutions', links: solutions},
        {title: 'Expertise', links: expertise},
        {title: 'Case studies', links: caseStudyLinks},
        {title: 'Newsroom', links: newsroom},
    ];
}
