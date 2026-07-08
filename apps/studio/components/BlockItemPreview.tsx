import type { PreviewProps } from 'sanity'
import { Badge, Box, Flex } from '@sanity/ui'

/**
 * Richer page-block array-item preview (prototype, wired on `ctaNewsletter`).
 *
 * Renders Sanity's default row (icon + title + subtitle) and appends a
 * right-aligned, colour-coded "kind" badge derived from the block title's
 * prefix (e.g. "CTA — Newsletter" → CTA). Because every block title follows
 * the "Kind — Name" convention, this component is reusable across all block
 * types — add `components: { preview: BlockItemPreview }` to roll it out.
 *
 * This is the low-risk tier: a fuller Gong-style expanded card (inline content
 * preview, variant selector) would be a custom array `components.item`.
 */
const TONE: Record<string, 'primary' | 'positive' | 'caution' | 'default'> = {
  Post: 'positive',
  Category: 'default',
  Tag: 'caution',
  Topic: 'caution',
  'Topic group': 'caution',
  CTA: 'primary',
}

export function BlockItemPreview(props: PreviewProps) {
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
