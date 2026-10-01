/**
 * Shared General-rail bucket builders for simple Finder (heroFinder).
 * Used by seed-home-page (full layout) and seed-finder-general-rail (surgical).
 */

/** Eric's end-to-end stage order — keep in sync with seed-home-page.mjs. */
const STAGE_ORDER = ['design', 'prototyp', 'manufactur', 'strategy', 'logistic', 'fulfil']

export function stageRank(title = '') {
  const t = title.toLowerCase()
  const i = STAGE_ORDER.findIndex((word) => t.includes(word))
  return i === -1 ? STAGE_ORDER.length : i
}

function bucketItem(_id, _key) {
  return {
    _key,
    _type: 'finderGeneralItem',
    item: {_type: 'reference', _ref: _id},
  }
}

function takeBucket(docs, keyPrefix, max = 3) {
  const out = []
  for (let i = 0; i < docs.length && out.length < max; i++) {
    const doc = docs[i]
    if (!doc?._id) continue
    out.push(bucketItem(doc._id, `${keyPrefix}-${i + 1}`))
  }
  return out
}

/**
 * Studio General buckets for Packaging Solution × All (max 3 each).
 * Refs only — feature image/video fall back to the document on www.
 *
 * @param {{
 *   lines?: {_id: string}[],
 *   industries?: {_id: string}[],
 *   customizations?: {_id: string}[],
 *   stages?: {_id: string, title?: string}[],
 *   caseStudies?: {_id: string}[],
 * }} candidates
 */
export function buildFinderGeneralBuckets(candidates) {
  const stages = [...(candidates.stages ?? [])].sort(
    (a, b) => stageRank(a.title) - stageRank(b.title),
  )
  return {
    railOrder: 'business',
    generalProducts: takeBucket(candidates.lines ?? [], 'gen-product'),
    generalIndustries: takeBucket(candidates.industries ?? [], 'gen-industry'),
    generalCustomizations: takeBucket(
      candidates.customizations ?? [],
      'gen-customization',
    ),
    generalExpertise: takeBucket(stages, 'gen-expertise'),
    generalCaseStudies: takeBucket(candidates.caseStudies ?? [], 'gen-case-study'),
  }
}
