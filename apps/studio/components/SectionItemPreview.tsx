import type { PreviewProps } from 'sanity'
import { Badge, Box, Flex } from '@sanity/ui'

import {
  SECTION_ENTITY,
  SECTION_ENTITY_TITLE,
  type SectionEntityTab,
} from '../schemas/sections/section-entity'

/**
 * Array-item preview for www sections — default row plus an entity-tab badge.
 * Badge comes from `_type` → entity map (ADR-020 §10), not title parsing, so
 * titles like "Logo wall" still get a Clients badge.
 */
const TONE: Record<
  SectionEntityTab,
  'primary' | 'positive' | 'caution' | 'default'
> = {
  solution: 'caution',
  caseStudy: 'positive',
  product: 'primary',
  customization: 'primary',
  expertise: 'caution',
  resource: 'default',
  client: 'positive',
  layout: 'default',
  cta: 'primary',
}

export function SectionItemPreview(props: PreviewProps) {
  const typeName = props.schemaType?.name
  const entity =
    typeName && typeName in SECTION_ENTITY
      ? SECTION_ENTITY[typeName as keyof typeof SECTION_ENTITY]
      : null

  return (
    <Flex align="center">
      <Box flex={1}>{props.renderDefault(props)}</Box>
      {entity ? (
        <Box paddingRight={3} style={{ flex: 'none' }}>
          <Badge
            tone={TONE[entity]}
            mode="outline"
            fontSize={0}
            padding={2}
            radius={2}
          >
            {SECTION_ENTITY_TITLE[entity]}
          </Badge>
        </Box>
      ) : null}
    </Flex>
  )
}
