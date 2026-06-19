import type { PreviewProps } from 'sanity'
import { Badge, Box, Flex } from '@sanity/ui'

/**
 * Richer page-section array-item preview (prototype, wired on `ctaNewsletter`).
 *
 * Renders Sanity's default row (icon + title + subtitle) and appends a
 * right-aligned, colour-coded "kind" badge derived from the section title's
 * prefix (e.g. "CTA — Newsletter" → CTA). Because every section title follows
 * the "Kind — Name" convention, this component is reusable across all section
 * types — add `components: { preview: SectionItemPreview }` to roll it out.
 *
 * This is the low-risk tier: a fuller Gong-style expanded card (inline content
 * preview, variant selector) would be a custom array `components.item`.
 */
const TONE: Record<string, 'primary' | 'positive' | 'caution' | 'default'> = {
  Post: 'positive',
  Category: 'default',
  Tag: 'caution',
  CTA: 'primary',
}

export function SectionItemPreview(props: PreviewProps) {
  const rawTitle = typeof props.title === 'string' ? props.title : ''
  const kind = rawTitle.includes('—') ? rawTitle.split('—')[0].trim() : null

  return (
    <Flex align="center">
      <Box flex={1}>{props.renderDefault(props)}</Box>
      {kind ? (
        <Box paddingRight={3} style={{ flex: 'none' }}>
          <Badge tone={TONE[kind] ?? 'default'} mode="outline" fontSize={0} padding={2} radius={2}>
            {kind}
          </Badge>
        </Box>
      ) : null}
    </Flex>
  )
}
