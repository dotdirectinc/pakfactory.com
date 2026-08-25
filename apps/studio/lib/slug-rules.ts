import type { SlugValue, ValidationContext } from 'sanity'

/**
 * Slug uniqueness across several document types.
 *
 * Sanity's built-in slug uniqueness is per type, which is not enough when two
 * types share a URL segment: a Product and a Product Line both live under
 * `/products/…`, so two documents of different types can each hold a valid,
 * unique-for-their-type slug and still collide on the site.
 *
 * Apply the same rule to every type in the set — checking from one side only
 * lets the other side create the collision.
 */

/** Types sharing the `/products/…` segment. */
export const PRODUCT_URL_TYPES = ['product', 'productLine']

const TYPE_LABELS: Record<string, string> = {
  product: 'product',
  productLine: 'product line',
}

export function uniqueSlugAcross(types: string[]) {
  return async (slug: SlugValue | undefined, context: ValidationContext) => {
    if (!slug?.current) return 'Slug is required'

    const client = context.getClient({ apiVersion: '2024-01-01' })
    const publishedId = (context.document as { _id?: string } | undefined)?._id?.replace(
      /^drafts\./,
      '',
    )

    const conflict = await client.fetch<{ _type: string; title?: string } | null>(
      `*[_type in $types && slug.current == $slug && !(_id in [$id, $draftId])][0]{_type, title}`,
      {
        types,
        slug: slug.current,
        id: publishedId ?? '',
        draftId: `drafts.${publishedId ?? ''}`,
      },
    )

    if (!conflict) return true

    const label = TYPE_LABELS[conflict._type] ?? conflict._type
    const named = conflict.title ? ` ("${conflict.title}")` : ''
    return `This slug is already used by a ${label}${named}. Product and Product Line share the /products/ path, so a slug has to be unique across both.`
  }
}

/**
 * Slug uniqueness scoped to a PARENT reference rather than to the whole type.
 *
 * The mirror of `checkScopedTaxonomyTitle`. A Property Value's slug appears in a
 * filter URL as `?{property}={value}` — `/products?sustainability=recyclable` —
 * so the **property is the namespace** and the slug only has to be unique inside
 * it. Board Colour's `gold` and Foil Colour's `gold` resolve to different facets
 * and never meet.
 *
 * Verified before this shipped: no front-end query looks a Property Value up by
 * slug alone (nothing references `propertyValue`, `attribute` or `attributeGroup`
 * in apps/*​/src or packages/*​/src), so nothing can start returning two documents.
 * ⚠️ If a query ever does `*[_type == "propertyValue" && slug.current == $slug]`
 * without a property filter, it has to key by property too.
 */
export function uniqueSlugWithinParent(type: string, scopeField: string, scopeLabel: string) {
  return async (slug: SlugValue | undefined, context: ValidationContext) => {
    if (!slug?.current) return 'Slug is required'

    const doc = context.document as Record<string, unknown> | undefined
    const scopeRef = (doc?.[scopeField] as { _ref?: string } | undefined)?._ref
    const publishedId = (doc?._id as string | undefined)?.replace(/^drafts\./, '')
    const client = context.getClient({ apiVersion: '2024-01-01' })

    const conflicts = await client.fetch<{ title: string | null; scope: string | null }[]>(
      `*[_type == $type && slug.current == $slug && !(_id in [$id, $draftId])]{
         title, "scope": ${scopeField}._ref
       }`,
      {
        type,
        slug: slug.current,
        id: publishedId ?? '',
        draftId: `drafts.${publishedId ?? ''}`,
      },
    )

    if (conflicts.length === 0) return true

    // No parent chosen yet — nothing to scope by, so any match is a clash.
    const clash = scopeRef ? conflicts.find((c) => c.scope === scopeRef) : conflicts[0]
    if (!clash) return true

    const named = clash.title ? ` ("${clash.title}")` : ''
    return (
      `This slug is already used in the same ${scopeLabel}${named}. ` +
      `Slugs have to be unique within a ${scopeLabel} — a filter URL reads ` +
      `?${scopeLabel}=<slug>, so two identical slugs under one ${scopeLabel} are indistinguishable.`
    )
  }
}
