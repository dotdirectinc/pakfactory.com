import {unstable_cache} from 'next/cache';
import {
  WEBSITE_NAVIGATION_QUERY,
  type WebsiteNavigationDoc,
} from '@pakfactory/sanity/queries';
import {getPublishedSanityClient} from '@/lib/sanity/client';
import {isSanityConfigured} from '@/lib/sanity/env';
import {
  WWW_CONTENT_REVALIDATE_SECONDS,
  WWW_WEBSITE_NAVIGATION_CACHE_TAG,
} from '@/lib/www-cache';

async function loadWebsiteNavigation(): Promise<WebsiteNavigationDoc> {
  if (!isSanityConfigured()) {
    return null;
  }

  try {
    return await getPublishedSanityClient().fetch<WebsiteNavigationDoc>(
      WEBSITE_NAVIGATION_QUERY,
    );
  } catch {
    return null;
  }
}

const getCachedWebsiteNavigation = unstable_cache(
  loadWebsiteNavigation,
  [WWW_WEBSITE_NAVIGATION_CACHE_TAG],
  {
    revalidate: WWW_CONTENT_REVALIDATE_SECONDS,
    tags: [WWW_WEBSITE_NAVIGATION_CACHE_TAG],
  },
);

/** Cached published `websiteNavigation` singleton, or null. */
export async function fetchWebsiteNavigation(): Promise<WebsiteNavigationDoc> {
  return getCachedWebsiteNavigation();
}
