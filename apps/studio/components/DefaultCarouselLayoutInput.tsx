import type {StringInputProps} from 'sanity'

/**
 * String radio that displays `carousel` when the stored value is unset.
 *
 * Field / object `initialValue: 'carousel'` only applies on create. Existing
 * Reviews sections never wrote `layoutVariant`, so Studio would show no
 * selection. Coerce display; choosing Marquee still writes an explicit value.
 */
export function DefaultCarouselLayoutInput(props: StringInputProps) {
  return props.renderDefault({
    ...props,
    value: props.value ?? 'carousel',
  })
}
