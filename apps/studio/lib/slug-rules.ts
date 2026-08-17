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
