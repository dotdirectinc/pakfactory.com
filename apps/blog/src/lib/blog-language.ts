import {
  BLOG_CONTRIBUTE_PAGE_IDS,
  BLOG_HOME_PAGE_IDS,
  BLOG_TOPICS_PAGE_IDS,
  DEFAULT_BLOG_LANGUAGE,
} from "@pakfactory/sanity/languages";

/** GROQ params for English-only blog reads until `/fr/*` routes ship. */
export function blogLanguageParams<T extends Record<string, unknown>>(
  params?: T,
): T & { language: typeof DEFAULT_BLOG_LANGUAGE } {
  return {
    language: DEFAULT_BLOG_LANGUAGE,
    ...params,
  } as T & { language: typeof DEFAULT_BLOG_LANGUAGE };
}

/** Params for the localized blog home singleton query. */
export function blogHomePageParams() {
  return blogLanguageParams({
    homePageId: BLOG_HOME_PAGE_IDS.en,
    monthStart: monthStartIso(),
  });
}

/**
 * Params for a landing/static page-by-slug query. The page builder projection
 * may include a postPopularRow section that references `$monthStart`, so it must
 * be provided alongside language + slug.
 */
export function blogPageBySlugParams(slug: string) {
  return blogLanguageParams({ slug, monthStart: monthStartIso() });
}

function monthStartIso(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}

/** Params for the localized topics index singleton query. */
export function blogTopicsPageParams() {
  return blogLanguageParams({
    topicsPageId: BLOG_TOPICS_PAGE_IDS.en,
    monthStart: monthStartIso(),
  });
}

/** Params for the 404 page singleton query (page builder + popular row). */
export function blogNotFoundPageParams() {
  return blogLanguageParams({
    monthStart: monthStartIso(),
  });
}

/** Params for the search page singleton query (page builder + popular row). */
export function blogSearchPageParams() {
  return blogLanguageParams({
    monthStart: monthStartIso(),
  });
}

/** Params for the contribute page singleton query (SEO + page builder). */
export function blogContributePageParams() {
  return blogLanguageParams({
    contributePageId: BLOG_CONTRIBUTE_PAGE_IDS.en,
    monthStart: monthStartIso(),
  });
}

/** Params for landing/static blogPage fetch by slug (page builder + popular row). */
export function blogLandingPageParams(slug: string) {
  return blogLanguageParams({
    slug,
    monthStart: monthStartIso(),
  });
}
