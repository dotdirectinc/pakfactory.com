/**
 * The ordered register of one-shot Sanity migrations.
 *
 * This file is the ONLY place migration order is declared. Everything else — the
 * runner, the ledger, `status` — reads it.
 *
 * ── What belongs here ───────────────────────────────────────────────────────────
 *
 * ONE-SHOT migrations only: a change that moves a dataset from one shape to the next
 * and is then done. Repeatable things — seeds, imports, parity checks — are TASKS and
 * stay one-per-command; sweeping them into a bulk `up` is how a seed gets re-run over
 * live content. They are listed at the bottom for orientation and are never executed
 * by the runner.
 *
 * ── The `probe` field, and why every entry has one ──────────────────────────────
 *
 * A ledger on its own is trusted state: it says what someone recorded, not what is
 * true. The probe is a GROQ expression returning `true` when the migration's effect is
 * ALREADY VISIBLE in the dataset — the same query a human would write to check by hand.
 * It makes `status` self-verifying, and it is what lets `adopt` seed the ledger for the
 * ~20 migrations that were applied to `production` long before this runner existed,
 * without anyone hand-writing a baseline they could get wrong.
 *
 * A probe is a statement about the dataset, so it is written to stay true FOREVER once
 * the migration has run. Probes that assert "the old key is gone" satisfy that; probes
 * that assert "the new key is populated" do not, if a later migration removes that key.
 * Where a later migration invalidated an earlier one's effect, the earlier entry carries
 * `supersededBy` and the runner never proposes it again.
 *
 * `probe: null` means "no honest probe exists yet". `status` prints `unknown` and
 * `adopt` refuses to touch it. That is deliberate: a guessed probe writes a false
 * ledger row, which is worse than an empty one.
 *
 * ── `ticket` ───────────────────────────────────────────────────────────────────
 *
 * The PROD key a migration's OWN script header declares, or `null`. Never inferred.
 *
 * Six entries originally carried keys guessed from the migration's date and subject.
 * Five pointed at real but unrelated tickets — blog i18n at "Follow up with Alek",
 * the case-study gallery at a share-button bug, body-table at "Invoice Processor
 * Upgrade". A plausible-looking wrong key is worse than a blank one: it reads as
 * provenance and sends whoever follows it somewhere real and irrelevant.
 *
 * If the script does not name a ticket and Jira has no match, the answer is `null`.
 *
 * ── `args` ─────────────────────────────────────────────────────────────────────
 *
 * `'flags'`      the script takes `--dataset/--confirm/--yes-production` (script-args.mjs).
 * `'legacy-env'` the script predates that rule and resolves its dataset from
 *                NEXT_PUBLIC_SANITY_DATASET. The runner REFUSES to execute these — see
 *                BUG-0032 — and `status` lists them as needing the retrofit.
 *                They can still be adopted, because reading a probe is safe.
 *
 *                NO ENTRY CARRIES THIS ANY MORE. All 15 were retrofitted; the value and
 *                the runner's refusal stay because the hazard is a property of the shape,
 *                not of those particular files, and the next script written from an old
 *                template will need catching.
 */

/** @typedef {'flags'|'legacy-env'} ArgStyle */

export const MIGRATIONS = [
  {
    id: '20260615-blog-i18n-en',
    ticket: null,
    title: 'Backfill language:"en" on blog i18n documents',
    pkg: '@pakfactory/studio',
    task: 'migrate:blog-i18n-en',
    script: 'apps/studio/scripts/migrate-blog-i18n-en.mjs',
    args: 'flags',
    probe: `count(*[_type in ["post","blogPage","blogCategory","blogTag"] && !defined(language)]) == 0`,
  },
  {
    id: '20260629-blog-navigation',
    ticket: null,
    title: 'Build blogNavigation from legacy blogSettings.categoryOrder + footer hrefs',
    pkg: '@pakfactory/studio',
    task: 'migrate:blog-navigation',
    script: 'apps/studio/scripts/migrate-blog-navigation.mjs',
    args: 'flags',
    probe: `count(*[_type == "blogNavigation"]) > 0`,
  },
  {
    id: '20260714-case-study-gallery',
    ticket: null,
    title: 'Flatten legacy galleryImage objects into native image array members',
    pkg: '@pakfactory/studio',
    task: 'migrate:case-study-gallery',
    script: 'apps/studio/scripts/migrate-case-study-gallery.mjs',
    args: 'flags',
    probe: `count(*[_type == "caseStudy" && (
      count(challenge[_type == "caseStudyGalleryBlock"].images[_type == "galleryImage"]) > 0 ||
      count(solution[_type == "caseStudyGalleryBlock"].images[_type == "galleryImage"]) > 0
    )]) == 0`,
  },
  {
    id: '20260717-redirect-trailing-slashes',
    ticket: null,
    title: 'Strip trailing slashes from redirect from/to',
    pkg: '@pakfactory/studio',
    task: 'migrate:redirect-slashes',
    script: 'apps/studio/scripts/strip-redirect-trailing-slashes.mjs',
    args: 'flags',
    // No honest probe: "/" is itself a legal `from`, and distinguishing a stripped
    // path from one that never had a slash needs the script's own normalisation rules.
    probe: null,
  },
  {
    id: '20260720-unset-legacy-blogsettings-defaults',
    ticket: 'PROD-2116',
    title: 'Unset the five per-type default objects from blogSettings',
    pkg: '@pakfactory/studio',
    task: 'cleanup:blogsettings-defaults',
    script: 'apps/studio/scripts/unset-legacy-blogsettings-defaults.mjs',
    args: 'flags',
    probe: `count(*[_id in ["blogSettings","drafts.blogSettings"] && (
      defined(postDefaults) || defined(categoryDefaults) || defined(tagDefaults) ||
      defined(authorDefaults) || defined(pageDefaults)
    )]) == 0`,
  },
  {
    id: '20260721-backfill-redirect-match-behaviour',
    ticket: 'PROD-2157',
    title: 'Backfill redirect matchType + behaviour from legacy type',
    pkg: '@pakfactory/studio',
    task: 'backfill:redirect-fields',
    script: 'apps/studio/scripts/backfill-redirect-match-behaviour.mjs',
    args: 'flags',
    probe: `count(*[_type == "redirect" && (!defined(matchType) || !defined(behaviour))]) == 0`,
  },
  {
    id: '20260721-unset-redirect-type',
    ticket: 'PROD-2157',
    title: 'Unset the legacy redirect.type (301/302) once behaviour carries it',
    pkg: '@pakfactory/studio',
    task: 'unset:redirect-type',
    script: 'apps/studio/scripts/unset-redirect-type.mjs',
    args: 'flags',
    after: ['20260721-backfill-redirect-match-behaviour'],
    probe: `count(*[_type == "redirect" && defined(type)]) == 0`,
  },
  {
    id: '20260722-redirect-groups',
    ticket: null,
    title: 'Create redirectGroup documents and point every redirect at one',
    pkg: '@pakfactory/studio',
    task: 'migrate:redirect-groups',
    script: 'apps/studio/scripts/migrate-redirect-groups.mjs',
    args: 'flags',
    probe: `count(*[_type == "redirectGroup"]) > 0 && count(*[_type == "redirect" && !defined(group)]) == 0`,
  },
  {
    id: '20260723-unset-sitemap-hint-fields',
    ticket: 'PROD-2194',
    title: 'Unset sitemapPriority / sitemapChangefreq from the per-type settings singletons',
    pkg: '@pakfactory/studio',
    task: 'cleanup:sitemap-hints',
    script: 'apps/studio/scripts/unset-sitemap-hint-fields.mjs',
    args: 'flags',
    probe: `count(*[_id in [
      "postSettings","categorySettings","topicSettings","authorSettings","pageSettings",
      "drafts.postSettings","drafts.categorySettings","drafts.topicSettings","drafts.authorSettings","drafts.pageSettings"
    ] && (defined(sitemapPriority) || defined(sitemapChangefreq))]) == 0`,
  },
  {
    id: '20260723-unset-ai-crawler-fields',
    ticket: 'PROD-2199',
    title: 'Unset retired aiTraining / aiAnswering toggles from posts + Global Settings',
    pkg: '@pakfactory/studio',
    task: 'cleanup:ai-crawler-fields',
    script: 'apps/studio/scripts/unset-ai-crawler-fields.mjs',
    args: 'flags',
    probe: `count(*[_type == "post" && (defined(aiTraining) || defined(aiAnswering))]) == 0 &&
      count(*[_id in ["settings","drafts.settings"] && (defined(aiTrainingDefault) || defined(aiAnsweringDefault))]) == 0`,
  },
  {
    id: '20260728-body-table',
    ticket: 'PROD-2224',
    title: 'Reverse bodyTable from the column-major experiment back to headers → rows',
    pkg: '@pakfactory/studio',
    task: 'migrate:body-table',
    script: 'apps/studio/scripts/migrate-body-table.mjs',
    args: 'flags',
    probe: `count(*[defined(body) && count(body[_type == "bodyTable" && defined(columns[0].header)]) > 0]) == 0`,
  },
  {
    id: '20260826-backfill-customization-option-role',
    ticket: 'PROD-2250',
    title: 'Backfill customizationOption.role (D47 §3)',
    pkg: '@pakfactory/studio',
    task: 'backfill:customization-role',
    script: 'apps/studio/scripts/backfill-customization-option-role.mjs',
    args: 'flags',
    // `role` was split into configuratorRole + hasPage (D55) and then removed (PROD-2538),
    // so the field this backfilled no longer exists. Its work survives in the successors.
    supersededBy: '20260917-unset-verified-deprecations',
    probe: null,
  },
  {
    id: '20260826-split-coating-customization-type',
    ticket: 'PROD-2250',
    title: 'Split the Coating customization type into Surface Coating + Spot Coating',
    pkg: '@pakfactory/studio',
    task: 'split:coating-type',
    script: 'apps/studio/scripts/split-coating-customization-type.mjs',
    args: 'flags',
    // Needs the script's own slug constants to probe honestly; deferred rather than guessed.
    probe: null,
  },
  {
    id: '20260827-customization-availability-axes',
    ticket: 'PROD-2250',
    title: 'Move customizationOption onto the four availability axes (D47 §1 / ADR-017)',
    pkg: '@pakfactory/studio',
    task: 'migrate:availability-axes',
    script: 'apps/studio/scripts/migrate-customization-availability-axes.mjs',
    args: 'flags',
    // Probes the SOURCE side — the legacy keys are gone — which stays true even after
    // PROD-2538 removed three of the four destinations.
    probe: `count(*[_type == "customizationOption" && (
      defined(appliesTo) || defined(except) || defined(incompatibleWith) || defined(relatedCustomizations)
    )]) == 0`,
  },
  {
    id: '20260827-option-category-benefits',
    ticket: 'PROD-2250',
    title: 'Retire customizationOption.category; rename whyChooseBlock → benefits',
    pkg: '@pakfactory/studio',
    task: 'migrate:option-category-benefits',
    script: 'apps/studio/scripts/migrate-customization-option-category-and-benefits.mjs',
    args: 'flags',
    probe: `count(*[_type == "customizationOption" && (defined(category) || defined(whyChooseBlock))]) == 0`,
  },
  {
    id: '20260827-product-line-style-cardinality',
    ticket: 'PROD-2250',
    title: 'Settle product line/style cardinality — drop the undeclared array copies',
    pkg: '@pakfactory/studio',
    task: 'migrate:product-cardinality',
    script: 'apps/studio/scripts/migrate-product-line-style-cardinality.mjs',
    args: 'flags',
    probe: `count(*[_type == "product" && (defined(productCategories) || defined(productStyleCategories))]) == 0`,
  },
  {
    id: '20260828-unset-retired-option-fields',
    ticket: 'PROD-2250',
    title: 'Unset the six retired customizationOption fields (Rename Map step 5)',
    pkg: '@pakfactory/studio',
    task: 'migrate:unset-retired-fields',
    script: 'apps/studio/scripts/migrate-unset-retired-option-fields.mjs',
    args: 'flags',
    after: ['20260827-option-category-benefits'],
    probe: `count(*[_type == "customizationOption" && (
      defined(materialSource) || defined(physicalProperties) || defined(aesthetic) ||
      defined(colors) || defined(sustainability) || defined(whyChooseBlock)
    )]) == 0`,
  },
  {
    id: '20260831-schema-review-d48',
    ticket: 'PROD-2250',
    title: "Eric's schema review — cardinality vocabulary + orphaned display flags",
    pkg: '@pakfactory/studio',
    task: 'migrate:schema-review-d48',
    script: 'apps/studio/scripts/migrate-schema-review-d48.mjs',
    args: 'flags',
    probe: `count(*[_type == "customizationOption" && (
      defined(showThicknessTable) || defined(showFluteTypeTable) || defined(showColorRange)
    )]) == 0 && count(*[_type == "customizationType" && cardinality in ["single","multiple"]]) == 0`,
  },
  {
    id: '20260901-unset-removed-deprecated-fields',
    ticket: 'PROD-2250',
    title: 'Sweep the nine deprecated fields removed in the same PR',
    pkg: '@pakfactory/studio',
    task: 'migrate:unset-removed-deprecated',
    script: 'apps/studio/scripts/migrate-unset-removed-deprecated-fields.mjs',
    args: 'flags',
    probe: `count(*[_type == "customizationOption" && (defined(whatIsBlock) || defined(comparedAgainst))]) == 0 &&
      count(*[_type == "product" && (
        defined(cardName) || defined(whatIsBlock) || defined(whyChooseBlock) ||
        defined(showcaseImages) || defined(comparedAgainst)
      )]) == 0 &&
      count(*[_type == "solution" && defined(relevantCapabilities)]) == 0`,
  },
  {
    id: '20260913-split-customization-role',
    ticket: 'PROD-2482',
    title: 'Split customizationOption.role into configuratorRole + hasPage (D55)',
    pkg: '@pakfactory/studio',
    task: 'migrate:split-customization-role',
    script: 'apps/studio/scripts/migrate-split-customization-role.mjs',
    args: 'flags',
    // Stays true after PROD-2538 unsets `role`: with no `role` left, nothing can lack a
    // successor. Probing "configuratorRole is populated" would have broken instead.
    probe: `count(*[_type == "customizationOption" && defined(role) &&
      (!defined(configuratorRole) || !defined(hasPage))]) == 0`,
  },
  {
    id: '20260915-product-tree-featured-image',
    ticket: 'PROD-2512',
    title: 'Move the product tree card image onto featuredImage',
    pkg: '@pakfactory/studio',
    task: 'migrate:product-tree-featured-image',
    script: 'apps/studio/scripts/migrate-product-tree-featured-image.mjs',
    args: 'flags',
    // Additive by design — the old keys are deliberately NOT unset here, so the probe
    // asks whether anything still carries an old key WITHOUT a successor.
    probe: `count(*[_type in ["productLine","productStyle"] &&
      (defined(cardImage) || defined(image)) && !defined(featuredImage)]) == 0`,
  },
  {
    id: '20260917-backfill-availability-decided-by',
    ticket: 'PROD-2532',
    title: 'Backfill customizationType.availabilityDecidedBy (D61)',
    pkg: '@pakfactory/studio',
    task: 'backfill:availability-decided-by',
    script: 'apps/studio/scripts/backfill-availability-decided-by.mjs',
    args: 'flags',
    probe: `count(*[_type == "customizationType" && !defined(availabilityDecidedBy)]) == 0`,
  },
  {
    id: '20260917-unset-verified-deprecations',
    ticket: 'PROD-2538',
    title: 'Unset the seven deprecated keys whose fields left the schema',
    pkg: '@pakfactory/studio',
    task: 'migrate:unset-verified-deprecations',
    script: 'apps/studio/scripts/migrate-unset-verified-deprecations.mjs',
    args: 'flags',
    after: ['20260913-split-customization-role'],
    probe: `count(*[_type == "customizationOption" && (
        defined(role) || defined(availableOnProducts) || defined(exceptProducts) ||
        defined(worksOnCustomizations) || defined(incompatibleWithCustomizations)
      )]) == 0 &&
      count(*[_type == "customizationType" && defined(cardinality)]) == 0 &&
      count(*[_type == "product" && defined(primarySolution)]) == 0`,
  },
  {
    id: '20260923-unset-values-per-item',
    ticket: 'PROD-2585',
    title: 'Unset property.valuesPerItem, whose field leaves the schema in the same PR',
    pkg: '@pakfactory/studio',
    task: 'migrate:unset-values-per-item',
    script: 'apps/studio/scripts/migrate-unset-values-per-item.mjs',
    args: 'flags',
    // Destructive with no successor — unlike every other unset here, the values are
    // not preserved anywhere, so the script prints each one before deleting it and the
    // run log is the only record. `production` carries the key on 0 of 9 Properties, so
    // a run there is a clean no-op; `development` holds 10 of 12.
    probe: `count(*[_type == "property" && defined(valuesPerItem)]) == 0`,
  },
  {
    id: '20260924-depends-on-requirements',
    ticket: 'PROD-2595',
    title: 'Reshape customizationType.dependsOn into requirements (each old reference → a requirement of one)',
    pkg: '@pakfactory/studio',
    task: 'migrate:depends-on-requirements',
    script: 'apps/studio/scripts/migrate-depends-on-requirements.mjs',
    args: 'flags',
    // Asserts the OLD shape is gone: no Type still holds a bare reference in dependsOn. The
    // relationship fill regroups afterwards; this probe stays true through that.
    probe: `count(*[_type == "customizationType" && count(dependsOn[defined(_ref)]) > 0]) == 0`,
  },
  {
    id: '20260925-expertise-stage-template',
    ticket: 'PROD-2577',
    title: 'Move expertiseStage.sections onto Expertise Page templates (expertiseStage.template)',
    pkg: '@pakfactory/studio',
    task: 'migrate:expertise-stage-template',
    script: 'apps/studio/scripts/migrate-expertise-stage-template.mjs',
    args: 'flags',
    // Asserts the OLD shape is gone: no stage (published or draft) still carries its own
    // sections. The field leaves the schema in the same PR; www reads the template and
    // falls back to legacy sections until this has run.
    probe: `count(*[_type == "expertiseStage" && defined(sections)]) == 0`,
  },
]

/**
 * The 20 `packages/sanity/scripts/*.ts` migrations are the 2026 content-model cutover.
 * They ran against both datasets long before this register existed, and several target
 * types that have since been renamed away — `migrate-rename-commercial-types` is itself
 * why some of those names no longer exist. A probe written against today's schema could
 * not distinguish "this ran" from "this type never existed", so they are recorded as
 * HISTORIC: visible in `status` for provenance, never candidates for `up`, never adopted
 * from a probe.
 *
 * Retiring this list is Phase 3 work — move them under `scripts/sanity/migrations/` and
 * decide per script whether it earns a probe or a tombstone.
 */
export const HISTORIC = [
  'migrate-content-model-cutover',
  'migrate-customization-applies-to',
  'migrate-customization-cleanup',
  'migrate-customization-properties-backfill',
  'migrate-description-naming',
  'migrate-description-naming-cleanup',
  'migrate-name-convention',
  'migrate-name-convention-cleanup',
  'migrate-page-consolidation',
  'migrate-product-normalize',
  'migrate-product-page-related-collections',
  'migrate-product-refs',
  'migrate-product-style-line',
  'migrate-product-to-single-refs',
  'migrate-remove-404-promobanner',
  'migrate-rename-commercial-types',
  'migrate-solution-haspage',
  'migrate-solution-remove-usecase-leftovers',
  'migrate-solution-titles',
  'migrate-unset-legacy-applies',
]

/**
 * Repeatable. Listed so nobody has to guess whether an absence from MIGRATIONS is a
 * decision or an oversight. The runner never executes these.
 */
export const TASKS = [
  { task: 'seed:blog-singleton-pages', pkg: '@pakfactory/studio', why: 'idempotent singleton seed' },
  { task: 'seed:per-type-settings', pkg: '@pakfactory/studio', why: 'idempotent singleton seed' },
  { task: 'seed:expertise-design', pkg: '@pakfactory/studio', why: 'idempotent content seed (PROD-2578); fixed _ids, replaces the stage template body' },
  { task: 'seed:expertise-strategy', pkg: '@pakfactory/studio', why: 'idempotent content seed (PROD-2577); fixed _ids, replaces the stage template body' },
  { task: 'import:notion-customization-demo', pkg: '@pakfactory/studio', why: 're-importable source of truth' },
  { task: 'fill:catalog', pkg: '@pakfactory/studio', why: 'run per catalogue review' },
  // Destructive, and paired with fill:catalog — the purge is only ever a prelude to a
  // rebuild from Notion + the Miro board. Dry-run by default; refuses to delete
  // referenced documents without --emit-map, which is what makes the rebuild repairable.
  { task: 'purge:catalog', pkg: '@pakfactory/studio', why: 'rebuild the catalog from source' },
  // The purge's other half: writes back the references --detach-referrers unset, to the
  // rebuilt successors, from the purge map. Idempotent — anything already in place is skipped.
  { task: 'repoint:catalog-refs', pkg: '@pakfactory/studio', why: 'repair references after a catalog rebuild' },
  { task: 'check:redirects-parity', pkg: '@pakfactory/studio', why: 'read-only check' },
  { task: 'check:structure-types', pkg: '@pakfactory/studio', why: 'read-only check' },
]

export const byId = new Map(MIGRATIONS.map((m) => [m.id, m]))
