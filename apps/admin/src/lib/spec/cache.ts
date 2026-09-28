import { unstable_cache } from "next/cache";
import { RULES_DATASET, type Loaded } from "./rules-source";

/**
 * Server cache for the Spec System's computed views (PROD-2614 performance).
 *
 * Every view is a function of one Sanity read (~1.7 MB, ~0.9 s) and the shared package, so the
 * RESULT is cached — not the raw response, which sits too close to Next's 2 MB data-cache limit
 * to rely on. Same 60 s freshness the pages already promise after a Studio publish; nothing is
 * stored anywhere else, and every answer is still the package's (decision 2026-09-25 — computed,
 * not persisted). `revalidateTag(SPEC_RULES_TAG)` clears it, e.g. from a Sanity publish webhook.
 *
 * Failures are thrown out of the cached function so they are never cached: a Sanity blip must
 * not pin an error page for a minute.
 */
export const SPEC_RULES_TAG = "spec-rules";

class SpecLoadError extends Error {}

export function cachedSpec<A extends unknown[], T>(
  key: string,
  load: (...args: A) => Promise<Loaded<T>>,
): (...args: A) => Promise<Loaded<T>> {
  const inner = unstable_cache(
    async (...args: A) => {
      const res = await load(...args);
      if (!res.ok) throw new SpecLoadError(res.error);
      return res.data;
    },
    // The dataset is part of the key, so pointing admin at another one never serves stale rules.
    ["spec", key, RULES_DATASET],
    { revalidate: 60, tags: [SPEC_RULES_TAG] },
  );
  return async (...args: A) => {
    try {
      return { ok: true, data: await inner(...args) };
    } catch (err) {
      if (err instanceof SpecLoadError) return { ok: false, error: err.message };
      throw err;
    }
  };
}
