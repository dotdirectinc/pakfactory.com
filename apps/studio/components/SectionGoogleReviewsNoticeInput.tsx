import {Card, Stack, Text} from '@sanity/ui'
import type {StringInputProps} from 'sanity'

/**
 * Read-only Content-tab notice for sections whose items are not CMS-curated
 * (e.g. testimonialsRow → Google Places). Display-only — does not patch the
 * document.
 */
export function SectionGoogleReviewsNoticeInput(_props: StringInputProps) {
  return (
    <Card padding={3} radius={2} tone="primary" border>
      <Stack space={3}>
        <Text size={1} weight="semibold">
          Live from Google Places (4–5★)
        </Text>
        <Text size={1} muted>
          Review cards load on the site from Google Places — only 4- and 5-star
          reviews, with Google’s overall rating in the footer. They are not
          curated or ordered in Sanity. Use the Heading tab for eyebrow, title,
          intro, and section link. Cached about every 24 hours.
        </Text>
      </Stack>
    </Card>
  )
}
