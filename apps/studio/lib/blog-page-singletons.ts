import { BLOG_HOME_PAGE_IDS, BLOG_TOPICS_PAGE_IDS } from './languages'

const BLOG_HOME_IDS = new Set(Object.values(BLOG_HOME_PAGE_IDS))
const BLOG_TOPICS_IDS = new Set(Object.values(BLOG_TOPICS_PAGE_IDS))

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

export function isBlogPageSingleton(doc?: BlogPageSingletonDoc): boolean {
  return isBlogHomeSingleton(doc) || isBlogTopicsSingleton(doc)
}
