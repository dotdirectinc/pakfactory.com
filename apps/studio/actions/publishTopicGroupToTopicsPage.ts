import { useState } from 'react'
import { PublishIcon } from '@sanity/icons'
import { useClient, useDocumentOperation } from 'sanity'
import type {
  DocumentActionComponent,
  DocumentActionDescription,
  SanityClient,
  SanityDocument,
} from 'sanity'
import {
  BLOG_TOPICS_PAGE_IDS,
  DEFAULT_LANGUAGE,
  type SupportedLanguageId,
} from '../lib/languages'

/**
 * publishTopicGroupToTopicsPage — custom publish action for `blogTopicGroup`.
 *
 * After publish, prepends the group to the matching Topic page Overview `topics[]`
 * when not already listed. Bookkeeping never blocks publishing.
 */

type TopicGroupDoc = SanityDocument & { language?: SupportedLanguageId }

type TopicPageRef = {
  _key: string
  _type: 'reference'
  _ref: string
}

function newArrayKey(): string {
  return Math.random().toString(36).slice(2, 14)
}

function resolveTopicsPageId(language?: string): string {
  const lang = (language ?? DEFAULT_LANGUAGE) as SupportedLanguageId
  return BLOG_TOPICS_PAGE_IDS[lang] ?? BLOG_TOPICS_PAGE_IDS.en
}

function topicRefId(item: { _ref?: string; topicGroup?: { _ref?: string } }): string | undefined {
  return item._ref ?? item.topicGroup?._ref
}

export async function prependTopicGroupToTopicsPage(
  client: SanityClient,
  groupId: string,
  language?: string,
): Promise<void> {
  const topicsPageId = resolveTopicsPageId(language)
  const page = await client.fetch<{ _id: string; topics?: TopicPageRef[] } | null>(
    `coalesce(
      *[_id == "drafts." + $pageId][0],
      *[_id == $pageId][0]
    ){ _id, topics }`,
    { pageId: topicsPageId },
  )

  if (!page?._id) return

  const topics = page.topics ?? []
  if (topics.some((item) => topicRefId(item) === groupId)) return

  const newItem: TopicPageRef = {
    _key: newArrayKey(),
    _type: 'reference',
    _ref: groupId,
  }

  await client.patch(page._id).set({ topics: [newItem, ...topics] }).commit()
}

export const publishTopicGroupToTopicsPage: DocumentActionComponent = (props) => {
  const { id, type, draft, published, onComplete } = props
  const { publish } = useDocumentOperation(id, type)
  const client = useClient({ apiVersion: '2024-01-01' })
  const [isPublishing, setIsPublishing] = useState(false)

  return {
    disabled: Boolean(publish.disabled),
    icon: PublishIcon,
    label: isPublishing ? 'Publishing…' : 'Publish',
    shortcut: 'Ctrl+Alt+P',
    onHandle: async () => {
      setIsPublishing(true)
      const doc = (draft ?? published) as TopicGroupDoc | null
      const groupId = id.replace(/^drafts\./, '')
      const language = doc?.language

      publish.execute()

      try {
        await prependTopicGroupToTopicsPage(client, groupId, language)
      } catch (err) {
        console.error(
          '[publishTopicGroupToTopicsPage] failed to prepend group on Topic page:',
          err,
        )
      }

      setIsPublishing(false)
      onComplete()
    },
  } satisfies DocumentActionDescription
}
