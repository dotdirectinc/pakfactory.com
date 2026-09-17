import 'server-only';

import type {SanityClient} from 'next-sanity';
import {draftMode} from 'next/headers';

import {getPublishedSanityClient, getSanityClient} from '@/lib/sanity/client';

/**
 * Is this request inside a Presentation / draft-mode session?
 *
 * `draftMode()` is a dynamic API: it THROWS when there is no request scope, and
 * `generateStaticParams` has none — `/products/[slug]` calls `listLines()` and
 * `/solutions/[slug]` calls `listSolutionPageSlugs()` from there. The throw is
 * caught and treated as "not a draft", which keeps static generation on the
 * cached published path. Without the catch, making a data module draft-aware
 * breaks the build.
 *
 * It also throws inside `unstable_cache`, for the same reason: no request scope.
 * That is fine and expected — a cached read is a published read by definition.
 */
export async function isDraftRequest(): Promise<boolean> {
    try {
        return (await draftMode()).isEnabled;
    } catch {
        return false;
    }
}

/**
 * The client a page's data module should read through.
 *
 * Draft mode needs the `drafts` perspective for two reasons, only one of which
 * is obvious. The first is content: unpublished edits must be visible. The
 * second is that `stega` is enabled ONLY on the drafts client (see
 * `./client.ts`), and stega encoding is what lets Sanity Presentation map
 * rendered output back to documents and fields. A page built entirely from
 * published reads carries nothing to map, so Presentation renders it but reports
 * "No matching documents" with no click-to-edit overlays.
 *
 * Outside draft mode nothing changes: same published client, same CDN, no token.
 *
 * NOT for sitemaps, llms.txt, or the revalidate webhook. Those must stay
 * published-only — a sitemap that lists draft URLs, or a webhook that stamps
 * from a draft, is a bug rather than a preview.
 */
export async function draftAwareClient(): Promise<SanityClient> {
    return (await isDraftRequest())
        ? getSanityClient()
        : getPublishedSanityClient();
}

/**
 * Run `fetcher` uncached in a draft session, or `cached` otherwise.
 *
 * Draft reads MUST NOT go through `unstable_cache`. Two reasons: a cached draft
 * is stale the moment the editor types again (so Presentation shows an old value
 * and looks broken), and the cache is shared across requests, so one editor's
 * unpublished content could be served to somebody else. Published reads keep
 * their cache keys, tags and revalidate windows untouched.
 */
export async function readThrough<T>(
    fetcher: () => Promise<T>,
    cached: () => Promise<T>,
): Promise<T> {
    return (await isDraftRequest()) ? fetcher() : cached();
}
