import { createReferencedByView } from './createReferencedByView'

/**
 * Reverse-reference tabs for the Customization and Property trees.
 *
 * All five answer a question the form cannot, because the reference that makes
 * the relationship lives on the OTHER document. See `createReferencedByView`.
 */

// ── Customization Category → its types ────────────────────────────────────────
/** 4 categories hold 36 types. The badge is each type's own option count, so
 *  the hierarchy reads top to bottom in one place: Materials → 15 types → 9 inks. */
export const CustomizationCategoryTypesView = createReferencedByView({
  tag: 'customization-category-types',
  sections: [
    {
      title: 'Types',
      type: 'customizationType',
      filter: 'category._ref == $id',
      subtitle: '"/" + slug.current',
      // string() is not decoration: GROQ returns null for number + string, so
      // without it the badge silently vanishes rather than erroring.
      badge: 'string(count(*[_type == "customizationOption" && type._ref == ^._id])) + " options"',
    },
  ],
  empty: 'No customization types sit under this category yet.',
})

// ── Customization Type → its options ──────────────────────────────────────────
/** The strongest of the five. 126 options live in one flat list, so this is the
 *  only place a type's actual menu appears together. */
export const CustomizationTypeOptionsView = createReferencedByView({
  tag: 'customization-type-options',
  sections: [
    {
      title: 'Options',
      type: 'customizationOption',
      filter: 'type._ref == $id',
      subtitle: '"/" + slug.current',
      // Only the exceptions. All 126 options are active today, so this shows
      // nothing — and the day one is discontinued, it shows up here first.
      badge: 'select(status == "active" => null, status)',
      thumb: 'media[0].asset._ref',
    },
  ],
  empty: 'No options reference this customization type yet.',
})

// ── Property → its values ─────────────────────────────────────────────────────
/** The badge names the broader value when one is set — "kind of Gold" — which is
 *  otherwise only visible by opening each value. */
export const PropertyValuesView = createReferencedByView({
  tag: 'property-values',
  sections: [
    {
      title: 'Values',
      type: 'propertyValue',
      filter: 'property._ref == $id',
      subtitle: '"/" + slug.current',
      badge: 'select(defined(kindOf) => "kind of " + kindOf->title, null)',
      thumb: 'image.asset._ref',
    },
  ],
  empty: 'No values belong to this property yet.',
})

// ── Property Value → what uses it ─────────────────────────────────────────────
/**
 * 🔴 The "Kind of this" section is the one that cannot be seen any other way.
 * `kindOf` points UP from the narrower value, so a value has no idea that
 * anything claims to be a kind of it — and that is exactly what makes retiring
 * one dangerous. It is listed even when empty, for that reason.
 *
 * Products is empty across the board today (`product.properties` is 0 of 310) and
 * will stay that way until the product data source starts sending specs. That is
 * a content gap, not a dead section — it says so rather than disappearing.
 */
export const PropertyValueUsedByView = createReferencedByView({
  tag: 'property-value-used-by',
  sections: [
    {
      title: 'Customization options',
      type: 'customizationOption',
      filter: '$id in properties[]._ref',
      subtitle: 'type->title',
    },
    {
      title: 'Products',
      type: 'product',
      filter: '$id in properties[].values[]._ref',
      subtitle: 'sku',
      empty: 'None yet — products do not carry properties until the product data source sends them.',
    },
    {
      title: 'Kind of this',
      type: 'propertyValue',
      filter: 'kindOf._ref == $id',
      empty: 'No narrower values point at this one.',
    },
  ],
  empty: 'Nothing references this value yet.',
})

// ── Customization Option → what uses it ───────────────────────────────────────
/**
 * The "can I retire this?" tab. An option named by a published case study cannot
 * quietly disappear.
 *
 * ⚠️ Products here reads `product.availableCustomizations` — populated on 1 of
 * 310. The option's own `availableOnProducts` field states the same relationship
 * from this side and is visible on the form above, so it is deliberately NOT
 * repeated here: this tab is for what the form cannot show.
 */
export const CustomizationOptionUsedByView = createReferencedByView({
  tag: 'customization-option-used-by',
  note: 'Everything that names this option from its own side. What this option itself declares is on the Edit tab.',
  sections: [
    {
      title: 'Products',
      type: 'product',
      filter: '$id in availableCustomizations[].customization._ref',
      subtitle: 'sku',
    },
    {
      title: 'Case studies',
      type: 'caseStudy',
      filter: '$id in capabilities[]._ref',
      subtitle: '"/" + slug.current',
    },
    {
      title: 'Achieved by',
      type: 'customizationOption',
      filter: '$id in achieves[]._ref',
      subtitle: 'type->title',
    },
    {
      title: 'Glossary terms',
      type: 'glossaryTerm',
      label: 'term',
      filter: '$id in relatedCustomizations[]._ref',
      subtitle: '"/" + slug.current',
    },
    {
      title: 'FAQs',
      type: 'faq',
      label: 'question',
      filter: '$id in about[]._ref || $id in relatedLinks[]._ref',
    },
  ],
  empty: 'Nothing references this option yet.',
})
