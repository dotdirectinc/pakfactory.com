import {
  BLOG_HOME_PAGE_IDS,
  BLOG_TOPICS_PAGE_IDS,
  BLOG_NOT_FOUND_PAGE_IDS,
  BLOG_SEARCH_PAGE_IDS,
  BLOG_CONTRIBUTE_PAGE_IDS,
} from './languages'

const BLOG_HOME_IDS = new Set<string>(Object.values(BLOG_HOME_PAGE_IDS))
const BLOG_TOPICS_IDS = new Set<string>(Object.values(BLOG_TOPICS_PAGE_IDS))
const BLOG_NOT_FOUND_IDS = new Set<string>(
  Object.values(BLOG_NOT_FOUND_PAGE_IDS),
)
const BLOG_SEARCH_IDS = new Set<string>(Object.values(BLOG_SEARCH_PAGE_IDS))
const BLOG_CONTRIBUTE_IDS = new Set<string>(
  Object.values(BLOG_CONTRIBUTE_PAGE_IDS),
)

export function stripDraftId(id?: string): string {
  return id?.replace(/^drafts\./, '') ?? ''
}

type BlogPageSingletonDoc = {
  _id?: string
  pageRole?: string
}

export function isBlogHomeSingleton(doc?: BlogPageSingletonDoc): boolean {
  const id = stripDraftId(doc?._id)
  return doc?.pageRole === 'home' || BLOG_HOME_IDS.has(id)
}

export function isBlogTopicsSingleton(doc?: BlogPageSingletonDoc): boolean {
  const id = stripDraftId(doc?._id)
  return doc?.pageRole === 'topics' || BLOG_TOPICS_IDS.has(id)
}

export function isBlogNotFoundSingleton(doc?: BlogPageSingletonDoc): boolean {
  const id = stripDraftId(doc?._id)
  return doc?.pageRole === 'notFound' || BLOG_NOT_FOUND_IDS.has(id)
}

export function isBlogSearchSingleton(doc?: BlogPageSingletonDoc): boolean {
  const id = stripDraftId(doc?._id)
  return doc?.pageRole === 'search' || BLOG_SEARCH_IDS.has(id)
}

export function isBlogContributeSingleton(doc?: BlogPageSingletonDoc): boolean {
  const id = stripDraftId(doc?._id)
  return doc?.pageRole === 'contribute' || BLOG_CONTRIBUTE_IDS.has(id)
}

export function isBlogPageSingleton(doc?: BlogPageSingletonDoc): boolean {
  return (
    isBlogHomeSingleton(doc) ||
    isBlogTopicsSingleton(doc) ||
    isBlogNotFoundSingleton(doc) ||
    isBlogSearchSingleton(doc) ||
    isBlogContributeSingleton(doc)
  )
}
