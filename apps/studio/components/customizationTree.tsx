import type { CSSProperties, ReactNode } from 'react'

/**
 * The parts two customization pickers share.
 *
 * `AvailableCustomizationsInput` (on Product) and `CompatibleCustomizationsInput`
 * (on Customization Option) both render the taxonomy as Category > Type > Option
 * with every option in scope drawn whether it is ticked or not, because you
 * cannot tick a box that is not on screen. They write different shapes into
 * different fields, but the tree they draw is the same tree.
 *
 * ⚠️ What lives here is the LEAF pieces and the pure functions — not the
 * category/type iteration. That was deliberate: the two pickers differ in enough
 * places (one has a partial-category notice and an unclassified-types notice,
 * the other has neither; one writes array objects, the other bare references)
 * that a shared tree would need three render-prop slots and read worse than two
 * explicit trees. Share what is identical, not what is merely similar.
 */

/** One Customization Option, flattened with its Type and Category for grouping. */
export type OptionRow = {
  _id: string
  title: string | null
  typeId: string | null
  typeTitle: string | null
  categoryId: string | null
  categoryTitle: string | null
}

export type TypeGroup = { id: string; title: string; options: OptionRow[] }
export type CategoryGroup = { id: string; title: string; types: TypeGroup[] }

/**
 * The projection every universe query selects. Kept here so the two pickers
 * cannot drift into fetching different shapes for the same `OptionRow` type —
 * a mismatch TypeScript would not catch, because GROQ results are cast.
 */
export const OPTION_PROJECTION = `
  _id,
  title,
  "typeId": type._ref,
  "typeTitle": type->title,
  "categoryId": type->category._ref,
  "categoryTitle": type->category->title
`

/**
 * Bucket flat option rows into Category > Type, sorting every level by title.
 *
 * Titles are recovered from the first row in each bucket rather than carried
 * separately: the projection already has them on every row, and a second source
 * for the same string is a second thing to keep in step.
 *
 * ⚠️ Sorting is alphabetical at every level, which puts Finishing above
 * Materials. That is semantically backwards — a material is chosen first and
 * everything else applies on top of it — but there is no stored order to sort
 * by: `customizationCategory.order` was removed on 2026-09-11 and the Categories
 * list went alphabetical deliberately. ❌ Do not hard-code "Materials first"
 * here. A magic title in a view component breaks the moment a category is
 * renamed, which is the exact bug PROD-2532 removed from the Product picker.
 */
export function group(rows: OptionRow[]): CategoryGroup[] {
  const categories = new Map<string, Map<string, OptionRow[]>>()
  for (const row of rows) {
    const categoryKey = row.categoryId ?? '__none__'
    const typeKey = row.typeId ?? '__none__'
    let types = categories.get(categoryKey)
    if (!types) {
      types = new Map<string, OptionRow[]>()
      categories.set(categoryKey, types)
    }
    const bucket = types.get(typeKey)
    if (bucket) bucket.push(row)
    else types.set(typeKey, [row])
  }

  const byTitle = (a: { title: string }, b: { title: string }) => a.title.localeCompare(b.title)
  const out: CategoryGroup[] = []
  for (const [categoryId, types] of categories) {
    const typeGroups: TypeGroup[] = []
    for (const [typeId, options] of types) {
      options.sort((a, b) => (a.title ?? '').localeCompare(b.title ?? ''))
      typeGroups.push({
        id: typeId,
        title: options[0]?.typeTitle ?? 'Untitled type',
        options,
      })
    }
    typeGroups.sort(byTitle)
    out.push({
      id: categoryId,
      title: typeGroups[0]?.options[0]?.categoryTitle ?? 'Untitled category',
      types: typeGroups,
    })
  }
  out.sort(byTitle)
  return out
}

/**
 * Array members need a `_key`. Same generator the other custom inputs use
 * (`ChartDataInput`), prefixed per field so a collision across fields is
 * impossible to produce by accident — hence a factory rather than one shared
 * counter.
 */
export function makeKeyGenerator(prefix: string): () => string {
  let seq = 0
  return () => {
    seq += 1
    return `${prefix}${Date.now().toString(36)}${seq.toString(36)}${Math.random().toString(36).slice(2, 6)}`
  }
}

export const LABEL: CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.07em',
  opacity: 0.45,
}

export const RESET_BUTTON: CSSProperties = {
  background: 'none',
  border: 'none',
  padding: 0,
  font: 'inherit',
  color: 'inherit',
  cursor: 'pointer',
}

/**
 * off    — nothing stored, and clicking stores something
 * on     — stored here, and clicking removes it
 * accent — stored here and carrying the field's extra meaning (pre-selected)
 * muted  — TRUE, but not from this document, so clicking cannot simply undo it
 *
 * 🔴 `muted` is the one that matters, and it is why this is a component rather
 * than an inline style. It shipped as a fix (PROD-2531): an inherited row drew
 * the same solid tick as a chosen one, so the control contradicted the sentence
 * above it, and the control is the part people act on. The distinction changes
 * THREE axes together — glyph colour, border, background — and callers add a
 * text label beside it, so it never rests on colour alone. Two copies of that
 * rule is one copy too many.
 */
export type TickState = 'off' | 'on' | 'accent' | 'muted'

export function Tick({ state, glyph = '✓' }: { state: TickState; glyph?: string }) {
  return (
    <span
      aria-hidden
      style={{
        width: 15,
        height: 15,
        flexShrink: 0,
        borderRadius: 3,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 10,
        lineHeight: 1,
        color:
          state === 'off'
            ? 'transparent'
            : state === 'muted'
              ? 'var(--card-muted-fg-color, rgba(125,125,125,0.9))'
              : '#fff',
        border:
          state === 'off' || state === 'muted'
            ? '1px solid var(--card-border-color, rgba(125,125,125,0.45))'
            : '1px solid transparent',
        background:
          state === 'accent'
            ? 'var(--card-badge-primary-dot-color, #2276fc)'
            : state === 'on'
              ? 'var(--card-badge-positive-dot-color, #3ab667)'
              : 'transparent',
      }}
    >
      {state === 'off' ? '' : glyph}
    </span>
  )
}

/** The muted box both pickers use to say something the tree cannot. */
export function Notice({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div
      style={{
        padding: '0.7rem 0.8rem',
        borderRadius: 4,
        fontSize: 13,
        background: 'var(--card-muted-bg-color, rgba(125,125,125,0.08))',
        ...style,
      }}
    >
      {children}
    </div>
  )
}

/** Filter box plus whatever the picker wants to say about its totals. */
export function SearchBox({
  value,
  onChange,
  placeholder,
  summary,
}: {
  value: string
  onChange: (next: string) => void
  placeholder: string
  summary: ReactNode
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        marginBottom: '0.75rem',
        flexWrap: 'wrap',
      }}
    >
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.currentTarget.value)}
        placeholder={placeholder}
        style={{
          flex: 1,
          minWidth: 160,
          font: 'inherit',
          fontSize: 13,
          padding: '0.4rem 0.6rem',
          borderRadius: 4,
          border: '1px solid var(--card-border-color, rgba(125,125,125,0.3))',
          background: 'transparent',
          color: 'inherit',
        }}
      />
      <div style={{ fontSize: 12, opacity: 0.6, flexShrink: 0 }}>{summary}</div>
    </div>
  )
}

/**
 * The collapsible Type row: chevron, title, a derived `n / total`, and whatever
 * actions the picker puts on the right.
 *
 * 🔴 The count is DERIVED and the actions are ACTIONS. A checkbox here would
 * promise a standing rule — "this product offers Paperboard" — that the data
 * does not keep: a tick expands to individual options at write time, so an
 * option added to this Type next month is not included. The moment someone
 * "fixes" that by storing the Type itself, coarse enumeration is back and the
 * carve-out fields that came with it follow. Both pickers store option
 * references at a single grain; neither may draw a Type as ticked.
 */
export function TypeHeader({
  title,
  chosen,
  total,
  note,
  collapsed,
  onToggleCollapsed,
  actions,
}: {
  title: string
  chosen: number
  total: number
  /** Anything the count alone would misreport — e.g. ticks the row shows but
   *  this document does not own. Without it a header reading `0 / 7` sits above
   *  a visibly ticked row and the two appear to disagree. */
  note?: string
  collapsed: boolean
  onToggleCollapsed: () => void
  actions?: ReactNode
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        borderBottom: '1px solid rgba(125,125,125,0.15)',
        padding: '0.35rem 0',
      }}
    >
      <button
        type="button"
        onClick={onToggleCollapsed}
        style={{
          ...RESET_BUTTON,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          flex: 1,
          minWidth: 0,
          textAlign: 'left',
        }}
      >
        <span style={{ fontSize: 10, opacity: 0.5, width: 10, flexShrink: 0 }}>
          {collapsed ? '▶' : '▼'}
        </span>
        <span style={{ fontWeight: 600, fontSize: 13 }}>{title}</span>
        <span style={{ fontSize: 11, opacity: 0.55 }}>
          {chosen} / {total}
          {note ? ` · ${note}` : ''}
        </span>
      </button>
      {actions ? <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>{actions}</div> : null}
    </div>
  )
}

/** One underlined text action in a `TypeHeader`. Disabled when it would do nothing. */
export function HeaderAction({
  label,
  onClick,
  disabled,
}: {
  label: string
  onClick: () => void
  disabled: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        ...RESET_BUTTON,
        fontSize: 11,
        opacity: disabled ? 0.3 : 0.75,
        textDecoration: 'underline',
        cursor: disabled ? 'default' : 'pointer',
      }}
    >
      {label}
    </button>
  )
}
