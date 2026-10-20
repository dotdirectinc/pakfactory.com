import 'server-only';

import {algoliasearch, type Algoliasearch, type InsightsClient} from 'algoliasearch';

/**
 * Server-only Algolia client for `/api/search` (PROD-3110).
 *
 * Key order: `ALGOLIA_SEARCH_KEY` (a dedicated key — release readiness), then
 * `NEXT_PUBLIC_ALGOLIA_API_KEY` (the blog's search key, already public). Never
 * the write key: a bug here must not be able to modify an index. Same order as
 * admin's `algolia-client.ts`, minus its write-key fallback.
 */

export function getSearchAppId(): string {
    return (
        process.env.ALGOLIA_APP_ID?.trim() ||
        process.env.NEXT_PUBLIC_ALGOLIA_APP_ID?.trim() ||
        ''
    );
}

function getSearchKey(): string {
    return (
        process.env.ALGOLIA_SEARCH_KEY?.trim() ||
        process.env.NEXT_PUBLIC_ALGOLIA_API_KEY?.trim() ||
        ''
    );
}

let client: Algoliasearch | null = null;

export function getSearchClient(): Algoliasearch | null {
    if (client) return client;
    const appId = getSearchAppId();
    const key = getSearchKey();
    if (!appId || !key) return null;
    client = algoliasearch(appId, key);
    return client;
}

let insights: InsightsClient | null = null;

/** Algolia Insights, for search click events (PROD-3111). Same app and search key. */
export function getInsightsClient(): InsightsClient | null {
    if (insights) return insights;
    // `insightsClient` is a type-only export of algoliasearch; build it off the search client.
    insights = getSearchClient()?.initInsights({}) ?? null;
    return insights;
}
