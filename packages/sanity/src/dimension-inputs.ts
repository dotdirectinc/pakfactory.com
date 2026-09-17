/**
 * Dimension input shapes — the single source for "which measurements does this
 * product take?".
 *
 * A product declares ONE shape (`product.dimensionInput`). Everything else is
 * derived from it:
 *
 *   - the Studio shows only that shape's min/max pairs on `dimensionRange`
 *   - the PDP renders one input box per axis, in `axes` order, using `axisLabel`
 *
 * It lives here rather than in the Studio because both sides need the same map.
 * A second copy in the front end is how "Gusset" ends up meaning two things.
 *
 * ⚠️ The shape is NOT derivable from the axes. Rectangular, Triangular,
 * Hexagonal and Custom Shaped are all L×W×H — same boxes, different product and
 * different page copy. So the shape is what gets stored; the axes are read off it.
 */

export const DIMENSION_AXES = ['length', 'width', 'height', 'diameter', 'gusset', 'drop'] as const

export type DimensionAxis = (typeof DIMENSION_AXES)[number]

/** What an editor and a customer see for each axis. Millimetres, always (D12). */
export const AXIS_LABEL: Record<DimensionAxis, string> = {
  length: 'Length',
  width: 'Width',
  height: 'Height',
  diameter: 'Diameter',
  gusset: 'Gusset',
  drop: 'Drop',
}

export type DimensionInput = {
  /** Stored on the document. */
  value: string
  /** Shown in the Studio and on the PDP. */
  title: string
  /** Which measurements this shape takes, in the order they should render. */
  axes: readonly DimensionAxis[]
}

export const DIMENSION_INPUTS: readonly DimensionInput[] = [
  { value: 'rectangular',    title: 'Default/Rectangular (LxWxH)',   axes: ['length', 'width', 'height'] },
  { value: 'cylinder',       title: 'Cylinder (DxH)',                axes: ['diameter', 'height'] },
  { value: 'bag-pouch',      title: 'Bag/Pouch (WxHxG)',             axes: ['width', 'height', 'gusset'] },
  { value: 'reusable-bag',   title: 'Reusable Bag (WxHxG + Drop)',   axes: ['width', 'height', 'gusset', 'drop'] },
  { value: 'triangular',     title: 'Triangular (LxWxH)',            axes: ['length', 'width', 'height'] },
  { value: 'hexagonal',      title: 'Hexagonal (LxWxH)',             axes: ['length', 'width', 'height'] },
  { value: 'custom-shaped',  title: 'Custom Shaped (LxWxH)',         axes: ['length', 'width', 'height'] },
  { value: 'flat-rectangle', title: 'Flat - Rectangle (WxH)',        axes: ['width', 'height'] },
  { value: 'flat-round',     title: 'Flat - Round (D)',              axes: ['diameter'] },
  { value: 'flat-custom',    title: 'Flat - Custom (WxH)',           axes: ['width', 'height'] },
  { value: 'roll',           title: 'Roll (WxL)',                    axes: ['width', 'length'] },
  { value: 'no-shape',       title: 'No Shape',                      axes: [] },
] as const

const BY_VALUE = new Map(DIMENSION_INPUTS.map((d) => [d.value, d]))

/**
 * The axes a shape takes. Unknown or unset returns [] — so a product with no
 * shape declared shows no measurement fields rather than all of them.
 */
export function axesFor(value: string | undefined | null): readonly DimensionAxis[] {
  return (value && BY_VALUE.get(value)?.axes) || []
}

/** True when this shape takes this measurement. Drives Studio field visibility. */
export function usesAxis(value: string | undefined | null, axis: DimensionAxis): boolean {
  return axesFor(value).includes(axis)
}

/** "L × W × H" for a shape, for previews and summaries. */
export function axesSummary(value: string | undefined | null): string {
  const axes = axesFor(value)
  return axes.length ? axes.map((a) => AXIS_LABEL[a]).join(' × ') : 'No measurements'
}
