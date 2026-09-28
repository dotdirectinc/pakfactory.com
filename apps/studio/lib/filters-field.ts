import { defineField } from 'sanity'

/**
 * Filters — which properties appear as the sidebar facets on a page that shows a
 * grid, in display order (PROD-2613).
 *
 * Extracted from `listingPage`, which held the only copy. After the page-template
 * restructure that type no longer fronts products or customizations, so the field
 * had to reach the catalog and library page types — and one definition beats four
 * spellings of the same idea.
 *
 * ❌ DO NOT add an enable/disable toggle. Considered and rejected: `listingPage`
 * has none, and a second filter concept in one Studio is worse than the missing
 * state. Whether a page renders a sidebar AT ALL belongs to the layout and the
 * front end; this field only says which properties it offers. That is why the
 * field is added exclusively to types whose pages actually render a grid — which
 * is what keeps "empty" meaningful.
 *
 * ❌ DO NOT make this read `showOnDetailPage`. A property hidden on a detail page
 * is still filterable, and that combination is the whole reason that field exists
 * (PROD-2610). Coupling them breaks it silently: no error, the filter simply never
 * appears.
 *
 * On a page type that resolves through `template->` (solutionStylePage and
 * productStylePage today, productLinePage if it is added later) this list belongs to
 * the LAYOUT, so every style pointing at the same layout document shares it. That
 * is intended — Eric confirmed it: two styles needing different sidebars get two
 * layout documents. Do not "fix" it by moving the field onto the content type.
 */

/** Which declaration scopes the picker. Omit to offer every property. */
export type FiltersDeclaredBy = 'productLine' | 'customizationType'

const PROPERTY_DESCRIPTION: Record<FiltersDeclaredBy, string> = {
  productLine:
    'The property to filter by. The list offers properties that a product line has declared. ' +
    "If it's empty, no line has declared any yet — that's where to add them, not here.",
  customizationType:
    'The property to filter by. The list offers properties that a customization type has ' +
    'declared, whether the options state it as a fact or offer it as a customer choice. ' +
    "If it's empty, no type has declared any yet — that's where to add them, not here.",
}

/** No `declaredBy` — the picker is unscoped, so say only what the row is for. */
const PROPERTY_DESCRIPTION_ANY = 'The property to filter by.'

type FilterRow = { property?: { _ref?: string } }

export function filtersField({
  group,
  declaredBy,
}: {
  group?: string
  declaredBy?: FiltersDeclaredBy
}) {
  return defineField({
    name: 'filters',
    title: 'Filters',
    type: 'array',
    ...(group ? { group } : {}),
    description:
      'Which properties appear as filters on this page, in the order you list them — drag to ' +
      'reorder. Leave it empty and every property in use on this page appears, alphabetically; ' +
      'fill it only to change the order, trim the list, or rename one. The values inside each ' +
      'filter always come from the content, so a filter never offers something that returns nothing.',
    of: [
      {
        type: 'object',
        // Unchanged from the inline definition this replaces — renaming it would
        // orphan the rows already stored on the listing pages.
        name: 'listingFilter',
        fields: [
          defineField({
            name: 'property',
            title: 'Property',
            type: 'reference',
            to: [{ type: 'property' }],
            // Scoped to what has actually been declared, so the picker cannot
            // offer a property no page will ever use. It CAN come back empty
            // while the catalogue is still being uploaded — the description
            // below says where to fix that, rather than leaving a blank dropdown
            // looking broken. Spelled as two whole objects rather than a
            // conditional spread, which widens `filter` to `string | undefined`
            // and no longer satisfies ReferenceOptions.
            options: declaredBy
              ? {
                  disableNew: true,
                  filter: `_id in *[_type == "${declaredBy}"].properties[].property._ref`,
                }
              : { disableNew: true },
            description: declaredBy ? PROPERTY_DESCRIPTION[declaredBy] : PROPERTY_DESCRIPTION_ANY,
            validation: (Rule) => Rule.required(),
          }),
          defineField({
            name: 'label',
            title: 'Label',
            type: 'string',
            description:
              "Optional override for the filter's heading. Blank uses the property's own title.",
          }),
        ],
        preview: {
          select: { title: 'label', property: 'property.title' },
          prepare({ title, property }) {
            return { title: title || property || 'Filter' }
          },
        },
      },
    ],
    // Two rows naming one property render as two identical filters side by side,
    // with nothing to say which is which.
    validation: (Rule) =>
      Rule.custom((rows) => {
        const refs = ((rows ?? []) as FilterRow[])
          .map((row) => row?.property?._ref)
          .filter((ref): ref is string => Boolean(ref))
        const duplicated = refs.some((ref, i) => refs.indexOf(ref) !== i)
        return duplicated ? 'Each property can only be listed once.' : true
      }),
  })
}
