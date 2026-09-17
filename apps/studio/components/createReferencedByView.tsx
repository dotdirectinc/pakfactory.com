import { useEffect, useMemo, useState } from 'react'
import { getPublishedId, useClient, useDocumentStore } from 'sanity'
import type { UserViewComponent } from 'sanity/structure'
import { IntentLink } from 'sanity/router'

/**
 * A document tab that answers "what points at this?".
 *
 * Sanity references are one-way. A Customization Type has no idea which Options
 * name it, a Property has no idea which Values belong to it — the arrow only
 * exists on the child. The Studio form therefore cannot show the relationship at
 * all, in either of the two shapes it takes:
 *
 *   • PARENT → CHILDREN. One list of one type. "The 9 Ink options."
 *   • USED BY. Several lists of several types. "Who would break if I retired
 *     this?" — the question you need answered before deleting anything.
 *
 * Both are the same query with a different filter, so this is a factory rather
 * than another hand-written component. Six such tabs already exist as six
 * near-identical files; the seventh through eleventh are these, and they are
 * declarations instead. The existing six are deliberately left alone — working
 * code is not worth the churn in a PR about something else.
 *
 * Every section is fetched in ONE query, so a five-section tab is one round trip.
 */

const THUMB = 44

export type ReferencedBySection = {
  /** Heading above this list. Hidden when the view has exactly one section. */
  title: string
  /** Document type of the rows — drives the edit link. */
  type: string
  /**
   * GROQ predicate. `$id` is this document's PUBLISHED id, so it matches
   * regardless of whether the referring document is a draft.
   * Written WITHOUT the `_type` clause — the factory adds it from `type`.
   */
  filter: string
  /**
   * GROQ expression for the row's main text. Defaults to `title` — override for
   * the types that name it something else (`faq.question`, `glossaryTerm.term`).
   */
  label?: string
  /** GROQ ordering, without the `order()` wrapper. Defaults to the label. */
  order?: string
  /** GROQ expression for the grey second line. */
  subtitle?: string
  /**
   * GROQ expression for the right-hand label — a status, a parent.
   * NOT for counting what points at this row: use `count`.
   */
  badge?: string
  /**
   * A per-row count badge — "9 options".
   *
   * This is a declaration rather than an expression because the obvious
   * hand-written version is wrong. A row with unsaved edits arrives as
   * `drafts.abc`, `dedupeDrafts` keeps it deliberately, and a reference NEVER
   * points at a draft id — so `count(*[ref == ^._id])` returns 0 for precisely
   * the rows someone is working on, and returns it silently (PROD-2526).
   * Declaring the relationship lets the factory match both id forms once, here.
   */
  count?: {
    /** Document type doing the pointing, e.g. `customizationOption`. */
    type: string
    /** Reference path on that type, e.g. `type._ref`. */
    ref: string
    /** Noun when the count is 1 — `option` renders "1 option". */
    one: string
    /** Noun otherwise — `options` renders "9 options" and "0 options". */
    many: string
  }
  /** GROQ path to an image asset `_ref`, e.g. `media[0].asset._ref`. */
  thumb?: string
  /** Shown in place of the list when this section alone is empty. */
  empty?: string
}

type Row = {
  _id: string
  label: string | null
  subtitle: string | null
  badge: string | number | null
  thumbRef: string | null
}

/**
 * Matches BOTH id forms, because the row may be a draft while every reference
 * pointing at it names the published document. Returns a raw number — the noun
 * is attached in `formatBadge`, which also keeps this clear of the GROQ trap
 * where number + string evaluates to null instead of erroring.
 */
function countExpr(c: NonNullable<ReferencedBySection['count']>): string {
  return `count(*[_type == "${c.type}" && (${c.ref} == ^._id || "drafts." + ${c.ref} == ^._id)])`
}

function sectionQuery(s: ReferencedBySection): string {
  const badge = s.count ? countExpr(s.count) : (s.badge ?? 'null')
  const projection = [
    '_id',
    `"label": ${s.label ?? 'title'}`,
    `"subtitle": ${s.subtitle ?? 'null'}`,
    `"badge": ${badge}`,
    `"thumbRef": ${s.thumb ?? 'null'}`,
  ].join(', ')
  const order = s.order ?? `${s.label ?? 'title'} asc`
  return `*[_type == "${s.type}" && (${s.filter})] | order(${order}) { ${projection} }`
}

/** Ref format: image-{assetId}-{WxH}-{ext} */
function thumbUrl(ref: string | null, projectId: string, dataset: string): string | null {
  if (!ref) return null
  const parts = ref.split('-')
  if (parts.length < 4 || parts[0] !== 'image') return null
  const [, assetId, dimensions, ext] = parts
  return `https://cdn.sanity.io/images/${projectId}/${dataset}/${assetId}-${dimensions}.${ext}?w=${THUMB * 2}&h=${THUMB * 2}&fit=crop&auto=format`
}

/**
 * The Studio listens to the dataset raw, so a document with unsaved edits comes
 * back twice — once as `drafts.abc`, once as `abc`. Collapse to one row and keep
 * the draft: a tab that exists to show what references you should show the
 * version you are about to publish.
 */
function dedupeDrafts(rows: Row[]): Row[] {
  const byPublishedId = new Map<string, Row>()
  for (const row of rows) {
    const key = getPublishedId(row._id)
    const seen = byPublishedId.get(key)
    if (!seen || row._id.startsWith('drafts.')) byPublishedId.set(key, row)
  }
  return [...byPublishedId.values()]
}

function formatBadge(s: ReferencedBySection, badge: Row['badge']): string | null {
  if (badge === null || badge === undefined || badge === '') return null
  if (!s.count) return String(badge)
  const n = Number(badge)
  return `${n} ${n === 1 ? s.count.one : s.count.many}`
}

export function createReferencedByView(opts: {
  sections: ReferencedBySection[]
  /** Shown when every section is empty. Say what would populate it. */
  empty: string
  /** Optional line under the top count — for a caveat worth stating every time. */
  note?: string
  tag: string
}): UserViewComponent {
  const { sections, empty, note, tag } = opts

  // `^._id` is the row's own id — the DRAFT id on any row with unsaved edits,
  // and nothing ever references a draft. An expression built on it reads 0 for
  // exactly the rows being worked on, without erroring, so it cannot be caught
  // by looking at the tab. Thrown at construction (module load) so a mistake
  // fails on boot instead of rendering a plausible wrong number. PROD-2526.
  for (const s of sections) {
    const authored = [s.filter, s.label, s.order, s.subtitle, s.badge, s.thumb]
    if (authored.some((expr) => expr?.includes('^._id'))) {
      throw new Error(
        `createReferencedByView(${tag}): section "${s.title}" uses ^._id, which is ` +
          `the draft id on any row with unsaved edits. Use the "count" option instead.`,
      )
    }
  }

  const QUERY = `{ ${sections.map((s, i) => `"s${i}": ${sectionQuery(s)}`).join(', ')} }`

  const View: UserViewComponent = ({ documentId }) => {
    const documentStore = useDocumentStore()
    const client = useClient({ apiVersion: '2024-01-01' })
    const id = useMemo(() => getPublishedId(documentId), [documentId])

    const [result, setResult] = useState<Record<string, Row[]> | null>(null)
    const [error, setError] = useState<string | null>(null)

    const projectId = client.config().projectId ?? ''
    const dataset = client.config().dataset ?? ''

    useEffect(() => {
      setResult(null)
      setError(null)
      const sub = documentStore
        .listenQuery(QUERY, { id }, {
          tag,
          throttleTime: 300,
          transitions: ['update', 'appear', 'disappear'],
        })
        .subscribe({
          next: (res: unknown) => {
            setResult((res ?? {}) as Record<string, Row[]>)
            setError(null)
          },
          error: (err: unknown) => {
            setError(err instanceof Error ? err.message : String(err))
          },
        })
      return () => sub.unsubscribe()
    }, [documentStore, id])

    if (error) {
      return <div style={{ padding: '1.5rem', color: 'crimson', fontSize: 13 }}>{error}</div>
    }
    if (result === null) {
      return <div style={{ padding: '1.5rem', opacity: 0.6, fontSize: 13 }}>Loading…</div>
    }

    const populated = sections.map((s, i) => ({
      section: s,
      rows: dedupeDrafts(Array.isArray(result[`s${i}`]) ? result[`s${i}`] : []),
    }))
    const total = populated.reduce((n, p) => n + p.rows.length, 0)
    const single = sections.length === 1

    if (total === 0) {
      return <div style={{ padding: '1.5rem', opacity: 0.6, fontSize: 13 }}>{empty}</div>
    }

    return (
      <div style={{ padding: '1rem 1.5rem' }}>
        <div style={{ fontSize: 12, opacity: 0.5, marginBottom: note ? 4 : '0.75rem' }}>
          {total} {total === 1 ? 'document' : 'documents'}
        </div>
        {note ? (
          <div style={{ fontSize: 12, opacity: 0.5, marginBottom: '0.75rem' }}>{note}</div>
        ) : null}

        {populated.map(({ section, rows }) => {
          // In a multi-section tab an empty section is dropped rather than shown
          // as a heading with nothing under it — unless it carries its own
          // message, which is how a section says "empty here is worth knowing".
          if (rows.length === 0 && !section.empty) return null
          return (
            <section key={section.title} style={{ marginBottom: single ? 0 : '1.5rem' }}>
              {single ? null : (
                <h2
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    opacity: 0.55,
                    margin: '0 0 0.4rem',
                  }}
                >
                  {section.title}
                  <span style={{ fontWeight: 400, marginLeft: 6 }}>{rows.length}</span>
                </h2>
              )}
              {rows.length === 0 ? (
                <div style={{ fontSize: 12, opacity: 0.5, paddingBottom: 4 }}>{section.empty}</div>
              ) : (
                <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                  {rows.map((row) => (
                    <RowItem
                      key={row._id}
                      row={row}
                      badge={formatBadge(section, row.badge)}
                      type={section.type}
                      showThumb={Boolean(section.thumb)}
                      src={thumbUrl(row.thumbRef, projectId, dataset)}
                    />
                  ))}
                </ul>
              )}
            </section>
          )
        })}
      </div>
    )
  }

  View.displayName = `ReferencedByView(${tag})`
  return View
}

function RowItem({
  row,
  badge,
  type,
  showThumb,
  src,
}: {
  row: Row
  badge: string | null
  type: string
  showThumb: boolean
  src: string | null
}) {
  return (
    <li
      style={{
        borderBottom: '1px solid rgba(125,125,125,0.15)',
        padding: '0.55rem 0',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}
    >
      {showThumb ? (
        <div
          style={{
            width: THUMB,
            height: THUMB,
            flexShrink: 0,
            borderRadius: 6,
            overflow: 'hidden',
            background: 'var(--card-muted-bg-color, rgba(125,125,125,0.1))',
          }}
        >
          {src ? (
            <img
              src={src}
              alt=""
              width={THUMB}
              height={THUMB}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              loading="lazy"
            />
          ) : null}
        </div>
      ) : null}

      <div style={{ minWidth: 0, flex: 1 }}>
        <IntentLink
          intent="edit"
          params={{ id: row._id, type }}
          style={{ color: 'inherit', textDecoration: 'none', fontWeight: 600, fontSize: 14 }}
        >
          {row.label || 'Untitled'}
        </IntentLink>
        {row.subtitle ? (
          <div style={{ fontSize: 12, opacity: 0.65, marginTop: 2 }}>{row.subtitle}</div>
        ) : null}
      </div>

      {badge === null ? null : (
        <div style={{ fontSize: 11, fontWeight: 600, opacity: 0.7, flexShrink: 0 }}>{badge}</div>
      )}
    </li>
  )
}
