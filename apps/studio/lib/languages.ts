export const SUPPORTED_LANGUAGES = [
  { id: 'en', title: 'English' },
  { id: 'fr', title: 'French' },
] as const

export const DEFAULT_LANGUAGE = 'en' as const

export const BLOG_I18N_SCHEMA_TYPES = [
  'post',
  'blogPage',
  'blogCategory',
  'blogTag',
] as const

export type SupportedLanguageId = (typeof SUPPORTED_LANGUAGES)[number]['id']

export const BLOG_HOME_PAGE_IDS = {
  en: 'blogHomePage',
  fr: 'blogHomePage-fr',
} as const
