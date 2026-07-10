export const BLOG_LANGUAGE_IDS = ['en', 'fr'] as const

export type BlogLanguageId = (typeof BLOG_LANGUAGE_IDS)[number]

/** Default locale served by apps/blog until `/fr/*` routes ship. */
export const DEFAULT_BLOG_LANGUAGE: BlogLanguageId = 'en'

/** Fixed document ids for localized blog home singletons. */
export const BLOG_HOME_PAGE_IDS: Record<BlogLanguageId, string> = {
  en: 'blogHomePage',
  fr: 'blogHomePage-fr',
}

/** Fixed document ids for localized topics index singletons. */
export const BLOG_TOPICS_PAGE_IDS: Record<BlogLanguageId, string> = {
  en: 'blogTopicsPage',
  fr: 'blogTopicsPage-fr',
}

/** Fixed document ids for localized contribute page singletons. */
export const BLOG_CONTRIBUTE_PAGE_IDS: Record<BlogLanguageId, string> = {
  en: 'blogContributePage',
  fr: 'blogContributePage-fr',
}
