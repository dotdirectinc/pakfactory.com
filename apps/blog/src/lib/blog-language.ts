import {
  BLOG_HOME_PAGE_IDS,
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
  });
}
