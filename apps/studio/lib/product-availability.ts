import { buildDependencyGraph } from '@pakfactory/sanity/customization-rules/dependencies'
import { resolveForProduct, type Resolution } from '@pakfactory/sanity/customization-rules/resolve'

/**
 * What a product offers in FULL — the options it lists directly plus everything the rules
 * derive from them (PROD-2595, ADR-022 decision 6). One helper, so the Customization tab, the
 * Available-customizations picker and its validation cannot disagree about the answer.
 *
 * The catalog is read PUBLISHED: the rules as they stand. The product is whatever the caller
 * passes — for a preset that is its BASE, because a preset offers what its base offers.
 */

export type AvailabilityCatalog = {
  categories: { _id: string; title: string | null }[]
  types: {
    _id: string
    title: string | null
    availabilityDecidedBy: 'product' | 'customization' | null
    categoryId: string | null
    /** One entry per requirement: its refs (old flat entries read as a requirement of one). */
    requirements: string[][] | null
  }[]
  options: { _id: string; title: string | null; typeId: string | null; compatibleCustomizations: string[] | null }[]
}

export const AVAILABILITY_CATALOG_QUERY = `{
  "categories": *[_type == "customizationCategory" && !(_id in path("drafts.**"))]{ _id, title },
  "types": *[_type == "customizationType" && !(_id in path("drafts.**"))]{
    _id, title, availabilityDecidedBy, "categoryId": category._ref,
    "requirements": dependsOn[]{ "refs": coalesce(anyOf[]._ref, [_ref]) }.refs
  },
  "options": *[_type == "customizationOption" && !(_id in path("drafts.**"))]{
    _id, title, "typeId": type._ref, "compatibleCustomizations": compatibleCustomizations[]._ref
  }
}`

/** The product's own rules input: its direct list and its exceptions, as ids. */
export type ProductRulesInput = {
  _id: string
  availableCustomizations: string[] | null
  customizationExceptions: { optionId: string | null; mode: 'add' | 'remove' | null; reason: string | null }[] | null
}

const clean = (id: string) => id.replace(/^drafts\./, '')

export function resolveProductAvailability(catalog: AvailabilityCatalog, product: ProductRulesInput): Resolution {
  const types = catalog.types
    .filter((t) => t.availabilityDecidedBy === 'product' || t.availabilityDecidedBy === 'customization')
    .map((t) => ({
      _id: t._id,
      title: t.title ?? undefined,
      availabilityDecidedBy: t.availabilityDecidedBy as 'product' | 'customization',
      categoryId: t.categoryId ?? undefined,
      requirements: (t.requirements ?? []).filter((g): g is string[] => Array.isArray(g) && g.length > 0),
    }))
  const options = catalog.options
    .filter((o) => o.typeId)
    .map((o) => ({
      _id: o._id,
      title: o.title ?? undefined,
      typeId: o.typeId as string,
      compatibleCustomizations: (o.compatibleCustomizations ?? []).map(clean),
    }))
  const rulesCatalog = { types, options }
  // `groups` is what makes a category dependency ("decided by Materials") mean ANY material.
  const { dependsOn, groups } = buildDependencyGraph(rulesCatalog)
  return resolveForProduct(
    rulesCatalog,
    {
      _id: clean(product._id),
      availableCustomizations: (product.availableCustomizations ?? []).map((id) => ({ optionId: clean(id) })),
      customizationExceptions: (product.customizationExceptions ?? [])
        .filter((e) => e.optionId && (e.mode === 'add' || e.mode === 'remove'))
        .map((e) => ({
          optionId: clean(e.optionId as string),
          mode: e.mode as 'add' | 'remove',
          reason: e.reason ?? undefined,
        })),
    },
    { dependsOn, groups },
  )
}

/** Every option id the resolution leaves standing, direct and derived alike. */
export function offeredOptionIds(resolution: Resolution): Set<string> {
  const ids = new Set<string>()
  for (const optionIds of resolution.availableByType.values()) for (const id of optionIds) ids.add(id)
  return ids
}
