import 'server-only';

import {unstable_cache} from 'next/cache';

/**
 * Cached Sanity reads that never cache a failure (PROD-2754 follow-up).
 *
 * Since `(site)` pages became static/ISR, whatever a read returns at build or
 * regeneration time is baked into the page and served from the CDN. The data
 * modules used to turn any fetch error into an empty result (`[]`, `null`),
 * so one failed request during a Vercel build shipped an empty `/products`.
 *
 * Now: a failing read is retried briefly, then rethrown. A throw is never
 * stored by `unstable_cache`; at runtime Next keeps serving the last good page
 * while regeneration fails, and at build time the deploy fails loudly instead
 * of publishing empty pages.
 */

/** Backoff between attempts; two retries absorb transient rate limits / timeouts. */
const RETRY_DELAYS_MS = [300, 1000] as const;

async function withRetry<T>(label: string, run: () => Promise<T>): Promise<T> {
    for (let attempt = 0; ; attempt += 1) {
        try {
            return await run();
        } catch (err) {
            const delay = RETRY_DELAYS_MS[attempt];
            if (delay === undefined) throw err;
            console.warn(
                `[sanity-cache] ${label}: attempt ${attempt + 1} failed, retrying in ${delay}ms`,
            );
            await new Promise((resolve) => setTimeout(resolve, delay));
        }
    }
}

/**
 * Drop-in for `unstable_cache` around Sanity reads: same arguments, but the
 * callback is retried and its failures propagate instead of being cached.
 */
export function sanityCache<Args extends unknown[], Result>(
    fn: (...args: Args) => Promise<Result>,
    keyParts: string[],
    options: Parameters<typeof unstable_cache>[2],
): (...args: Args) => Promise<Result> {
    const label = keyParts.join(':');
    return unstable_cache(
        (...args: Args) => withRetry(label, () => fn(...args)),
        keyParts,
        options,
    );
}

/**
 * Log a failed Sanity read (always — production included, so build and
 * function logs show the cause) and hand the error back for rethrowing:
 * `throw sanityReadFailed('[catalog] products fetch failed:', err)`.
 */
export function sanityReadFailed(message: string, err: unknown): unknown {
    console.error(message, err);
    return err;
}
