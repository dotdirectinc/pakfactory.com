# Foundations — the shared schema patterns (PROD-2286)

Every content type in this Studio reuses one definition of each shared pattern.
Area tasks (Taxonomy, Solutions, Resources, Products, …) **import from here** —
they do not re-declare tab sets, SEO fields, link objects, validation, or the
sections framework. This keeps `Conventions.md` §2.3–§2.6 satisfiable by import
rather than by reviewer memory.

If you find yourself writing a `groups:` literal, an SEO field, a `readOnly:
true`, or an insert menu by hand — stop and import instead.

## The patterns

| Need | Import | From |
| ---- | ------ | ---- |
| **Tabs (field groups)** — the §2.4 eight-tab set, fixed order, Content default | `groupsFor([...])`, `GROUPS` | `./field-groups` |
| **SEO + Social fields** — meta, robots toggles (defaulted from the type's settings singleton), OG | `seoFields()`, `socialFields()` | `./seo-fields` |
| **Settings singleton** — per-type metadata formats + indexation defaults | `typeDefaultFields()` | `./type-default-fields` |
| **Internal/external link** — reference or URL, picker filtered to routable types | `linkTargetFields()` | `./link-target-fields` |
| **Linkable-type list / picker filter** | `LINKABLE_DOCUMENT_TYPES`, `LINKABLE_TYPE_FILTER` | `./linkable-document-types` |
| **Social links array** (author / footer) | `socialLinksField()`, `socialLinkArrayMember()` | `./social-link-schema` |
| **Sections framework** — one `sections` array + grouped insert menu, **no presentation fields** | `sectionsField()`, `sectionInsertMenu()` | `./sections` |
| **Row section** — heading · intro · source · count · curated override (derive fallback) | `rowSectionFields()` | `./row-section-fields` |
| **Source-owned / deprecate / max-curated / warn-range / taxonomy picker** — §2.6 | `sourceOwned()`, `deprecateField()`, `maxCurated()`, `warnOutOfRange()`, `taxonomyPickerOptions` | `./schema-guards` |
| **Taxonomy title uniqueness** (ignoring case + punctuation, §4.2) | `uniqueTaxonomyTitle()` | `./taxonomy-rules` |
| **Slug uniqueness across types** sharing a URL segment | `uniqueSlugAcross([...])` | `./slug-rules` |
| **Media-tagged image** with enforced `alt` (§2.3) | `taggedImageField()` | `./media-tags` |

## The tab set (`field-groups.ts`)

The closed vocabulary, in editor order — a ninth tab or a typo is a TypeScript
error:

```
Content · Categorization · Publishing · Sections · Specs · Schema & AI · SEO · Social
```

`groupsFor([...])` returns only the tabs you pass, **always in this order**, with
Content pre-selected (or the first tab, if the type has no Content). Tag each
field with `group: GROUPS.categorization` so the id can never drift.

```ts
import { groupsFor, GROUPS } from '../lib/field-groups'

export const thing = defineType({
  name: 'thing',
  type: 'document',
  groups: groupsFor(['content', 'categorization', 'seo', 'social']),
  fields: [
    defineField({ name: 'title', type: 'string', group: GROUPS.content, /* … */ }),
  ],
})
```

> **Terminology note:** the page-composition concept is **"Sections"** platform-wide
> (ADR-015, superseding ADR-012's "block") — pending Eric's ratification. The blog's
> `pageBuilder` field keeps its name until PROD-2293 renames it.

## The §2.3 non-negotiables (not enforced by import — still on you)

Every type: a `description` on **every** field, a `title` on every enum value, a
`preview` (title + subtitle + media), and `alt` + `hotspot: true` on every image
(use `taggedImageField`). These are per-field authoring duties the imports can't
do for you — see `Conventions.md` §2.3.

## Not adopted

`@sanity/presets` was evaluated (1.0.6) and **not** used as the base — see
[ADR-016](../../../docs/adr/0016-sanity-presets-evaluation.md). Our `lib/` sets
encode contracts a generic preset would strip.
