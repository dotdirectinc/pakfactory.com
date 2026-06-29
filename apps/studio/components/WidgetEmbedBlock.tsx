import type { BlockProps } from 'sanity'
import { Badge, Box, Card, Flex, Text } from '@sanity/ui'

type WidgetPreview = {
  internalTitle?: string
  widgetType?: string
  headline?: string
  productTitle?: string
}

type WidgetEmbedValue = {
  widget?: WidgetPreview
}

function widgetTypeLabel(widgetType?: string): string {
  switch (widgetType) {
    case 'cta':
      return 'CTA Block'
    case 'product-card':
      return 'Product Card'
    default:
      return 'Widget'
  }
}

function widgetTypeTone(
  widgetType?: string
): 'primary' | 'positive' | 'caution' | 'default' {
  switch (widgetType) {
    case 'cta':
      return 'primary'
    case 'product-card':
      return 'positive'
    default:
      return 'default'
  }
}

function widgetDetail(widget?: WidgetPreview): string | undefined {
  if (!widget?.widgetType) return undefined
  switch (widget.widgetType) {
    case 'cta':
      return widget.headline
    case 'product-card':
      return widget.productTitle
    default:
      return undefined
  }
}

/**
 * Rich in-canvas preview for `widgetEmbed` blocks inside post body Portable Text.
 * Wired via `components.block` on the `widgetEmbed` schema.
 */
export function WidgetEmbedBlock(props: BlockProps) {
  const value = props.value as WidgetEmbedValue | undefined
  const widget = value?.widget
  const title = widget?.internalTitle || 'Untitled widget'
  const detail = widgetDetail(widget)

  return (
    <Box paddingY={2}>
      <Card padding={3} radius={2} shadow={1} tone="transparent" border>
        <Flex align="center" gap={3} marginBottom={2}>
          <Badge tone={widgetTypeTone(widget?.widgetType)} mode="outline" fontSize={0}>
            {widgetTypeLabel(widget?.widgetType)}
          </Badge>
          <Text size={1} weight="semibold">
            {title}
          </Text>
        </Flex>
        {detail ? (
          <Text size={1} muted>
            {detail}
          </Text>
        ) : (
          <Text size={1} muted>
            Pick a saved widget to embed in the post body.
          </Text>
        )}
      </Card>
      <Box hidden>{props.renderDefault(props)}</Box>
    </Box>
  )
}
