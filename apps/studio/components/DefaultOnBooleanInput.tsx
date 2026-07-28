import type { BooleanInputProps } from 'sanity'

/**
 * Boolean input that displays ON when the stored value is unset (`undefined`/`null`).
 *
 * Sanity’s default switch treats unset as off, which fights fields with
 * `initialValue: true` on existing documents that never wrote the key
 * (PROD-2206 `applyWatermark`). Coerce display to on; user toggles still
 * write an explicit `true` / `false`.
 */
export function DefaultOnBooleanInput(props: BooleanInputProps) {
  return props.renderDefault({
    ...props,
    value: props.value !== false,
  })
}
