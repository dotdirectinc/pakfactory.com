import {
    breadcrumbList,
    itemList,
    jsonLdGraph,
    newsArticle,
    organization,
    serializeJsonLd,
} from '@pakfactory/seo';

import type {
    NewsCard,
    NewsItem,
    PressBoilerplate,
} from '@/lib/newsroom/types';
import {absoluteUrl, getSiteUrl} from '@/lib/site';
import {WWW_ROUTES} from '@/lib/www-routes';

const NEWSROOM_NAME = 'Newsroom';

function toIso(value: string | null | undefined): string | undefined {
    if (!value) return undefined;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function publisherNode(boilerplate: PressBoilerplate): {
    org: Record<string, unknown>;
    orgId: string;
} {
    const origin = getSiteUrl().replace(/\/+$/, '');
    const orgId = `${origin}#organization`;
    return {
        orgId,
        org: organization({
            name: boilerplate.companyName,
            url: origin,
            id: orgId,
            ...(boilerplate.logoUrl ? {logo: boilerplate.logoUrl} : {}),
        }),
    };
}

/**
 * `/newsroom/[slug]` graph: Organization + NewsArticle + BreadcrumbList.
 * NewsArticle, not BlogPosting — Google treats them differently (PROD-2909).
 * A release has no byline, so the Organization is author and publisher.
 */
export function buildNewsArticleJsonLd(
    item: NewsItem,
    boilerplate: PressBoilerplate,
    image: string | undefined,
): string {
    const pageUrl = item.seo.canonicalUrl || absoluteUrl(item.href);
    const {org, orgId} = publisherNode(boilerplate);

    return serializeJsonLd(
        jsonLdGraph([
            org,
            newsArticle({
                id: `${pageUrl}#article`,
                url: pageUrl,
                headline: item.title,
                description: item.summary || undefined,
                datePublished: toIso(item.publishedAt),
                dateModified: toIso(item.lastModified ?? item.publishedAt),
                ...(image ? {image} : {}),
                author: {'@id': orgId},
                publisher: {'@id': orgId},
                ...(item.categoryLabel
                    ? {articleSection: item.categoryLabel}
                    : {}),
            }),
            breadcrumbList([
                {name: 'Home', url: absoluteUrl(WWW_ROUTES.home)},
                {name: NEWSROOM_NAME, url: absoluteUrl(WWW_ROUTES.newsroom)},
                {name: item.title, url: pageUrl},
            ]),
        ]),
    );
}

/** `/newsroom` graph: ItemList of releases + BreadcrumbList. */
export function buildNewsroomJsonLd(items: readonly NewsCard[]): string {
    return serializeJsonLd(
        jsonLdGraph([
            itemList({
                id: `${absoluteUrl(WWW_ROUTES.newsroom)}#releases`,
                name: 'PakFactory press releases',
                items: items.map((item) => ({
                    name: item.title,
                    url: absoluteUrl(item.href),
                })),
            }),
            breadcrumbList([
                {name: 'Home', url: absoluteUrl(WWW_ROUTES.home)},
                {name: NEWSROOM_NAME, url: absoluteUrl(WWW_ROUTES.newsroom)},
            ]),
        ]),
    );
}
