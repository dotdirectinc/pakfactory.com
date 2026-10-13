import {defineField} from 'sanity'

import {GROUPS} from './field-groups'
import {seoFields} from './seo-fields'

type CatalogPageCopyFieldsOptions = {
  /**
   * Include the category-tab hint (customization catalog only — products
   * has no equivalent sentence on the filter rail).
   */
  categoryHint?: boolean
}

/**
 * Shared hero, SEO, and catalog-grid UI copy for Product / Customization
 * Catalog Page layout docs (PROD-3001). The faceted grid stays route-owned;
 * these fields drive the H1, intro, metadata, and filter chrome labels.
 */
export function catalogPageCopyFields({
  categoryHint = false,
}: CatalogPageCopyFieldsOptions = {}) {
  return [
    defineField({
      name: 'h1',
      title: 'H1',
      type: 'string',
      group: GROUPS.content,
      description:
        'Page heading above the catalog grid. When blank, the site uses its built-in fallback.',
    }),
    defineField({
      name: 'intro',
      title: 'Intro',
      type: 'text',
      rows: 3,
      group: GROUPS.content,
      description:
        'Short description under the H1. When blank, the site uses its built-in fallback.',
    }),
    defineField({
      name: 'searchPlaceholder',
      title: 'Search placeholder',
      type: 'string',
      group: GROUPS.content,
      fieldset: 'catalogUiCopy',
      description: 'Placeholder (and accessible name) for the catalog search box.',
    }),
    defineField({
      name: 'emptyMessage',
      title: 'No-results message',
      type: 'text',
      rows: 2,
      group: GROUPS.content,
      fieldset: 'catalogUiCopy',
      description: 'Shown when search or filters match nothing.',
    }),
    defineField({
      name: 'resetLabel',
      title: 'Reset filters label',
      type: 'string',
      group: GROUPS.content,
      fieldset: 'catalogUiCopy',
      description:
        'Label for clearing filters (desktop rail and mobile drawer).',
    }),
    defineField({
      name: 'productLineFacetLabel',
      title: 'Product Line facet label',
      type: 'string',
      group: GROUPS.content,
      fieldset: 'catalogUiCopy',
      description:
        'Title of the Product Line filter group on this catalog page only.',
    }),
    ...(categoryHint
      ? [
          defineField({
            name: 'categoryHint',
            title: 'Category filter hint',
            type: 'text',
            rows: 2,
            group: GROUPS.content,
            fieldset: 'catalogUiCopy',
            description:
              'Hint under the shared filters when a category tab must be picked first.',
          }),
        ]
      : []),
    ...seoFields({group: GROUPS.seo}),
  ]
}

/** Fieldset for the catalog UI label fields on the Content tab. */
export const catalogPageCopyFieldsets = [
  {
    name: 'catalogUiCopy',
    title: 'Catalog UI copy',
    options: {collapsible: true, collapsed: false},
  },
]
