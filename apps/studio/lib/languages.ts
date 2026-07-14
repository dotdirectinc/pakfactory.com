// i18n is DORMANT (parked 2026-07-07) — English-only. No French content exists yet,
// and the two-homepage-per-language desk view was interfering with the team workflow.
// The i18n machinery is kept in place (plugin, hidden `language` field, per-type slug
// scoping, the -fr ID keys below) so re-enabling is a one-line change: uncomment the
// French entry here AND restore the per-language `.map()` in structure/index.ts
// (blogHomepageItem / blogTopicsPageItem). See apps/blog/memory.md § i18n.
export const SUPPORTED_LANGUAGES = [
  { id: 'en', title: 'English' },
  // { id: 'fr', title: 'French' },   // ← dormant; re-add to reactivate i18n
] as const

export const DEFAULT_LANGUAGE = 'en' as const

export const BLOG_I18N_SCHEMA_TYPES = [
  'post',
  'blogPage',
  'blogCategory',
  'blogTopicGroup',
  'blogTag',
] as const

export type SupportedLanguageId = (typeof SUPPORTED_LANGUAGES)[number]['id']

export const BLOG_HOME_PAGE_IDS = {
  en: 'blogHomePage',
  fr: 'blogHomePage-fr',
} as const

export const BLOG_TOPICS_PAGE_IDS = {
  en: 'blogTopicsPage',
  fr: 'blogTopicsPage-fr',
} as const

export const BLOG_NOT_FOUND_PAGE_IDS = {
  en: 'blogNotFoundPage',
  fr: 'blogNotFoundPage-fr',
} as const

export const BLOG_SEARCH_PAGE_IDS = {
  en: 'blogSearchPage',
  fr: 'blogSearchPage-fr',
} as const

export const BLOG_CONTRIBUTE_PAGE_IDS = {
  en: 'blogContributePage',
  fr: 'blogContributePage-fr',
} as const
