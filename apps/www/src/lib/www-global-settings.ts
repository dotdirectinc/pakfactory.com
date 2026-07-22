import { unstable_cache } from "next/cache";
import { BLOG_GLOBAL_SETTINGS_QUERY } from "@pakfactory/sanity/queries";
import { getPublishedSanityClient } from "@/lib/sanity/client";
import { isSanityConfigured } from "@/lib/sanity/env";

const WWW_GLOBAL_SETTINGS_CACHE_TAG = "www-global-settings";

export type WwwGlobalSettings = {
  /** GTM container ID (e.g. GTM-XXXXXXX) from Global Settings → Integrations. */
  gtmId?: string | null;
};

async function loadWwwGlobalSettings(): Promise<WwwGlobalSettings | null> {
  if (!isSanityConfigured()) return null;
  try {
    return await getPublishedSanityClient().fetch<WwwGlobalSettings | null>(
      BLOG_GLOBAL_SETTINGS_QUERY,
    );
  } catch {
    return null;
  }
}

const getCachedWwwGlobalSettings = unstable_cache(
  loadWwwGlobalSettings,
  [WWW_GLOBAL_SETTINGS_CACHE_TAG],
  { revalidate: 300, tags: [WWW_GLOBAL_SETTINGS_CACHE_TAG] },
);

/** Global Settings singleton — GTM container ID for production analytics inject. */
export async function fetchWwwGlobalSettings(): Promise<WwwGlobalSettings | null> {
  return getCachedWwwGlobalSettings();
}
