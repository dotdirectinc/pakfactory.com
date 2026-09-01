# ADR-017: Customization availability by axis, and `role` on the Option

**Status:** Accepted (2026-08-26) — settled with Eric as **D47** in the content-model register (`pakfactory-content-model/Decisions.md`), after a review round raised against four baselines: self-contained, editor-legible, not over-complicated, cleanly mappable by the Registry. Supersedes the availability shape in **D42–D44** and the "configurability needs no flag" position in **D46**. Implements PROD-2250.

## Context

`customizationOption.appliesTo` was answering two unrelated questions in one reference array:

- **which products offer this as a choice** — the product data source's Product Style × Customization Option matrix (~686 pairs, 68 options in the Additional Customization category alone)
- **which materials this can be applied to** — the finish × material constraint

Which grid a given row belonged to was knowable only by inspecting each reference's `_type`. D42 handled that by requiring a validation rule to reject a wrong-axis pick — a field that needs a rule to stop it crossing its own axis. One array can also carry only one meaning for "empty", and the two grids need opposite defaults, which is why the finish × material constraint repeatedly ended up with nowhere to live.

Separately, D46 held that configurability needed no flag, on the grounds that a product's `availableCustomizations` already implies it. Two facts overturned that:

1. `product.availableCustomizations` becomes **Registry-owned and read-only** (PROD-2295, decision b). Deriving *"is this a configurator choice"* from a field the Registry owns asks the question of the system that should be receiving the answer.
2. Empty availability fires on **25 of 33 published Options** while admitting it cannot tell which case it is in — a warning editors learn to ignore before the real case arrives.

## Decision

### 1. Availability splits into four fields, one axis each

| Field | Points at | Question | Empty means |
| --- | --- | --- | --- |
| `availableOnProducts` | `productLine` · `productStyle` · `product` | which products offer this as a choice | **offered nowhere** — fails closed |
| `exceptProducts` | `productStyle` · `product` | carve-outs from the above | no carve-out |
| `worksOnCustomizations` | `customizationType` · `customizationOption` | which materials this can be applied to | **no material restriction** — it only narrows what availability established |
| `incompatibleWithCustomizations` | `customizationType` · `customizationOption` | what it clashes with | no known clashes — fails open, deliberately; an unauthored clash must not invent one |

The opposite defaults are the point: one array can carry only one default.

**Boundary rule, stated in both descriptions:**

> Material constraints are always positive, in `worksOnCustomizations`. `incompatibleWithCustomizations` is only for two things a customer might otherwise pick together.

Without it, *"Soft Touch doesn't work on blister plastic"* has two homes and the allow-list/deny-list duplication returns.

**D42's wrong-axis validation is retired, not implemented.** Each picker offers one axis, so a wrong-axis pick is unpickable rather than rejected.

**`except` is frozen** — not widened, not split, not removed. D42's plan to add a `customizationOption` target is withdrawn. At **0 of 33 populated** every path stays open, and the first real carve-out in authoring decides which axis it belongs to.

Its targets do narrow to `productStyle · product`: the field it replaces also accepted a `productLine`, and a carve-out at line grain says the same thing as not listing that line in `availableOnProducts`. At 0 of 33 populated nothing is stranded, and the migration reports anything it finds rather than filtering silently.

### 2. `role` on the Option — `configurable` | `reference`

Required, `initialValue: 'configurable'`, with a **backfill of all 33 published Options in the same PR as the field**.

- **configurable** — a customer picks this in the configurator. *Matte, High-Barrier, SBS.*
- **reference** — technical; it has a library page but never reaches the configurator. *VMPET Film, Matte Lamination.*

**It sits on the Option, not the Type.** A Type is a taxonomy of what things *are* — Lamination holds Matte, Gloss, Paper and Leather Lamination — while who picks them is orthogonal to that, and **a Type can be mixed**. At Type level the only way to express a mixed Type is to split it by role, making the library structure serve the configurator. And `role` decides facts about *this document*; holding it on the parent means an Option inherits its own properties, which is inheritance-with-overrides — retired by D12 and removed from this branch by D30.

**The Type gets no field.** *Is there a panel for this Type* is a rollup — true if any of its Options is `configurable`.

Default is `configurable` because it fails loud in the Studio: a forgotten `reference` Option produces a warning nobody needed, which is visible; a forgotten `configurable` Option would go silent and hide a customer-facing choice.

### 3. A configurable Option has no detail page

| `role` | Detail page | In configurator | Availability fields | Images |
| --- | --- | --- | --- | --- |
| `configurable` | **no URL** | yes | authored | yes — the configurator swatch |
| `reference` | library page, own photos and explanation | never | empty, correctly | yes — its own |

Configurable Options keep `slug` — it stops being a URL segment but stays the key the Studio's picker filters resolve against.

This narrows D46's *"both sets get pages — a page comes from being an Option."*

### 4. The Surface Finish split by material family stays, on a new justification

The split (*Surface Finish — Paper* / *— Film*, each with its own *Matte*) was created because the finish × material constraint had nowhere to live. `worksOnCustomizations` now holds that on either shape, so **the original justification is gone.** It survives on a reason that was never about fields: **a document carries one image and one description**, and a customer picks a finish by looking at a swatch.

Two Options titled *Matte* is therefore a deliberate exception with distinct slugs (`matte-paper` / `matte-film`). **Do not merge them, and do not add uniqueness validation on Option titles.**

### 4b. `cardinality` on the Type — `single` | `multiple`

Required, `initialValue: 'single'`, backfilled for all existing Types in the same migration.

> How many of this Type's Options a customer may pick in the configurator.

**It is a prerequisite for the `customizationType` target on `incompatibleWithCustomizations`** (D43): *"can't combine with Embossing & Debossing"* only reads unambiguously once you know whether a customer takes one Option from that Type or several. The two therefore ship together.

**Not inherited from the Category.** Materials carry a blanket *"Single Selection (Within Each Type)"* in the diagram, but Finishing and Additional Customization are mixed — Embossing & Debossing and Closures allow several while Foiling and Windows do not — so the Category cannot answer it.

`multiple` is the **marked exception**: the diagram badges exactly those Types *"Multiple Selection (Within Each Type)"*, and everything else is `single`. In this dataset that is **Embossing & Debossing, Closures, Reinforcement & Utility, and Pulls & Lifts** (the diagram's *Opening & Access*); the diagram's *Embellishments* and *Technology* have no Sanity Type yet.

### 5. One scope algebra

> Resolve availability by the most specific matching entry. Where entries match at different grains — product, style, line — the narrower one decides. `exceptProducts` is shorthand for a denial at a finer grain, not a separate mechanism.

This matches how the Registry resolves scope (`rule_scope`, ADR-0008 #10 option C in `pakfactory.com-backend`), so there is one rule to map rather than two that usually agree. It also settles a case set subtraction does not answer: a line allowed → a style inside it excluded → a product inside that style explicitly allowed. Most-specific-wins makes the product available.

### 6. The model-vs-renderer tiebreaker

> Enforce in the model when the fact must be authored and can therefore be wrong. Leave it to the renderer when the fact is derivable from data already authored.

`kindOf` is derivable from whether anything points at a value → the renderer decides, the Studio validates nothing (D40, amended). Finish × material is derivable from nothing → it needs a field.

## Build order

1. ✅ **`role` + the backfill of all 33**, in one PR (#379). Until the backfill runs the availability warning fires on every unclassified document, which is the noise `role` exists to remove.
2. ✅ The four availability fields — three renames and one new field — with the conditional warning on `availableOnProducts` reading `role`. **This was a data migration, not a rename:** `appliesTo` is populated on 8 of 33 documents and renaming the key in the schema strands those values, so `migrate-customization-availability-axes.mjs` shipped in the same PR.
3. ✅ `achieves`, with the non-sufficiency description in the field description.
4. ✅ `cardinality` on `customizationType` — shipped **in the same PR as** the `customizationType` target on `incompatibleWithCustomizations` (D43), which is what required it. See §4b.
5. ✅ Retired `relatedCustomizations` on `customizationOption` (hard remove, 0 of 33 populated) and gave `comparedAgainst` the same `deprecateField()` treatment as its Product twin. `comparedAgainst` is **deprecated, not removed** — 8 of 33 are populated, so the data stays legible while nothing new is written; its minimum-3 rule goes with it, since a read-only field cannot be brought up to a minimum.

**Do not implement:** axis validation, a `customizationOption` target on `exceptProducts`, a Type-level role flag, uniqueness validation on Option titles, or Studio enforcement of `kindOf`.

**Applied 2026-08-26, after the diagram:** the six Options the first backfill mis-set — Matte / Gloss / Soft Touch Lamination and UV / Aqueous / Varnish Coating — are corrected to `reference` by `backfill:customization-role -- --reclassify`, and the `Coating` Type is split by `split:coating-type`. Splitting the Type does **not** reintroduce a Type-level role flag: the Type carries no `role` field, it is only that each Type's Options now happen to agree.

## Follow-on: the remaining Rename Map rows on `customizationOption`

Not part of D47, but executed against the same type once D47's build order closed
(`pakfactory-content-model/Rename Map.md`, "Still to do — fields"):

- **`category` retired.** The Category is reachable as `type->category`, and a second stored path to the same fact is how the two drift apart. Removing it also removed the Type picker's filter, which needed a category on *this* document to narrow by — so the Type picker is now unfiltered and always visible. That trade (23 Types instead of a narrowed handful, with search) was taken rather than storing a fact twice to make a picker shorter. **Verified lossless before removal:** all 33 Options agreed with `type->category`, 0 drift, and no Option's Type lacked a category. The migration re-runs that check per dataset and refuses to unset if it fails.
- **`whyChooseBlock` → `benefits`**, matching Product and Product Style (D33) — "block" named the mechanism, not the meaning. **`whatIsBlock` retired**: an Option is an instance, and the definition of what a thing *is* belongs to the Glossary Term, stated once.
- Both old fields are **deprecated, not deleted** — 8 of 33 carry copy, and `whatIsBlock` has nowhere to move to until the glossary surface exists. That is steps 1–4 of the Rename Map's procedure; step 5 waits for a sweep once nothing reads them.

## Follow-on: product line/style cardinality

Settled with Richard **2026-08-27**, before the product data source begins populating — the last blocker on that work:

> **A product belongs to exactly one Product Line, but may take several Styles within that line.**

So `productLine` is a **single reference** and `productStyle` stays an **array**. The asymmetry is the decision, not an oversight, and it is narrower than `Entities/Product.md`, which says *Single* for both — the Style half of that spec is what changed.

**Why it needed settling rather than reading off the docs.** Three sources said Single (D1's Line → Style → Product hierarchy, `Product.md`, Rename Map row 70) but the deployed schema said arrays for both, on the grounds that a product can span more than one line. The Rename Map's *"nothing in the model supports"* was written without that context, and `Product.md`'s rows were last touched by a mechanical find-replace, so "Single" surviving there was not evidence anyone had re-affirmed it.

**The invisible second copy is the real defect this closes.** Every product already carried `productLine` and `productStyle` in the *data* — written by `packages/sanity/scripts/migrate-product-refs.ts` — while **neither was declared in the schema**. Editors saw only the arrays, nothing kept the singles in step, and because they were undeclared no validation could see them drift. They agreed only because nobody had edited since. The first bulk write would have broken that silently.

**Verified lossless before the change:** of 26 products, **0** sat in more than one line, **0** in more than one style, and every existing single ref agreed with its array's first entry. The migration re-checks all three per dataset and refuses to write if any fails.

## Follow-on: the zero-populated Rename Map rows, and `glossaryTerm`

Cleared while the product tables were still empty — all schema-only, and much cheaper now than after the product data source populates:

| Change | Populated | Note |
| --- | --- | --- |
| `productLine.styleOrder` → `styles` | 0 | an array is ordered by definition, so `*Order` named the mechanism |
| `productStyle.bannerImage` → `cardImage` | 0 | a banner is a shape, not a meaning; matches Product Line and Case Study |
| `productStyle.hero.title` → `hero.label` | 0 | *labelled* "Badge label" but *named* `title`, so it collided with the document's own title in every projection |
| `dieline.gated` → `isGated` | 0 | a boolean reads as a question; 0 dieline documents exist at all |
| `customizationOption.faqs` → deprecated | **2** | not in the designed field list — see below |

**No migration ships with these.** All four renames are 0-populated *including drafts*, so there is nothing to move; a migration would have been ceremony. The one live-looking reader — `PRODUCT_COLLECTION_META_FOR_PATH_QUERY` reading `hero.title` and `bannerImage` — is **dead**: it filters on `product.primaryLandingPage` and `primaryCollection`, neither of which exists on the product schema, and dereferences a `productCollection` type that does not exist. Same family as the stale `/capabilities/**` routes; a separate problem, not fixed here.

**`faqs` is deprecated rather than deleted.** It is absent from the designed field list in `Entities/Customization Option.md` — the file that calls itself *"the truth until it ships"* — but 2 Options carry real Q&A. Deprecating answers *"not designed"* without answering *"throw it away"*.

**`customizationOption.glossaryTerm` is now built.** It was designed (*"The definition lives there **only**; the Option page pulls it, never retypes it"*) and never deployed. This is the field `whatIsBlock` retires **into** — until it existed, deprecating `whatIsBlock` left its 8 documents of definition copy with nowhere to go, which is the consequence recorded above and now closed. ⚠️ There are **0 Glossary Term documents**, so the picker starts empty; `disableNew` is deliberately not set, because the terms must be creatable before anything can point at them.

## Follow-on: `productStyle[0]` is the primary

Settled with Richard **2026-08-27**, closing the last incompatibility between the Sanity model and the spec registry.

The registry resolves a product's offer set from **one** style — `product.style_id`, flagged `is_primary` in `app.product_style_link` — while Sanity's `productStyle` is an array with no primary flag. The rule is **positional: `productStyle[0]` is the primary.**

That is already what both sides do: the registry's importer takes `multi(…)[0]`, and `is_primary` is backfilled from `product.style_id`. The rule had simply never been stated, so nothing depended on it deliberately and nothing checked it.

**Position is therefore meaningful** — dragging the array in the Studio changes which style the offer set resolves from. The field description says so, because an editor reordering a list has no other way to know.

**Why a warning rather than a resolution.** The registry deliberately left the merge primary-only (`20260819190000_product_style_links.sql`): going many-to-many needs a production ruling between **union / intersection / primary-only**, because two style-tier rows for one attribute can disagree and the merge would otherwise pick one arbitrarily. Today's multi-style products are compatible, so primary-only and union return the same answer — but that is a property of the current data, not of the model. `app.v_style_disagreement` reports the first genuine contradiction, which is when that deferred ruling becomes due.

The check is **deliberately narrow**: only two style-tier rows explicitly stating different `offered`. Presence-vs-absence is not reported, because a style with no row is inheriting from the family tier and reporting that would fire on nearly every product — the same failure as the pre-`role` availability warning, which fired on 25 of 33 documents and taught editors to ignore it.

## Follow-on: Rename Map step 5 — six of nine retired fields removed

The Rename Map's procedure ends at *"remove the old field"*, and warns that a field marked `deprecated()` sits at steps 1–4, not 5 — those rows *"read as done and are not"*. Nine deprecated fields on `customizationOption` had been sitting at step 4. **Six came out; three could not.**

**Removed, each verified lossless first rather than inferred from the deprecation:**

| Field(s) | Successor | Evidence |
| --- | --- | --- |
| `materialSource` · `physicalProperties` · `aesthetic` · `colors` · `sustainability` | `properties` | all **33** references across 8 Options were already in `properties`, zero gaps |
| `whyChooseBlock` | `benefits` | all **8** Options carrying it have a populated `benefits` |

`migrate:unset-retired-fields` re-checks both conditions **per dataset** and refuses to write if either fails — "it was safe on production" is not a fact about development. Removing a field from the schema does not remove it from the documents, so the migration unsets the keys; otherwise the dataset keeps six orphaned copies, which is the same undeclared-second-copy that `productLine`/`productStyle` showed is how two sources of one fact drift apart.

**Not removable, and each blocked differently:**

- **`whatIsBlock`** — 8 populated, and its destination `glossaryTerm` exists but holds **0 documents**. Removing it destroys the only copy.
- **`comparedAgainst`** — 8 populated, **no successor field at all**. Removal would be deletion, not migration.
- **`faqs`** — 2 populated, not in the designed field list, no successor.

None of the three is a migration; each needs a decision about where the content goes, or an accepted loss. They stay read-only meanwhile so nothing new accrues, and the schema now records why each is stuck rather than leaving it to be re-derived.

## Consequences

- **`reference` is classified from Eric's `Capabilities Flow` diagram (2026-08-26), which is the authoritative source.** The diagram badges each **Type**, and the badges map onto `role` one-for-one: *"Not Customizable"* → every Option under it is `reference`; no badge, or *"Single / Multiple Selection (Within Each Type)"* → `configurable`; *"only for Product Customization" + "No detail page"* → `configurable`. Reference Types: **Pouch Layer** (Materials), **Lamination**, **Surface Coating**, **Cutting**, **Gluing** (Finishing). Configurable-but-no-page Types: **Surface Finish (paper-based)**, **Surface Finish (non-paper)**, **Pouch Material**, **Food-Grade Material**.
- **This corrects the first reading of §2, which held that `reference` had no members.** That was inferred from D47's examples (VMPET Film and the other Pouch Layer films, still unauthored) rather than from a Type-level rule, and the first backfill therefore wrote `configurable` to all 33 published Options. The diagram puts **6 of them under reference Types** — Matte / Gloss / Soft Touch Lamination, and UV / Aqueous / Varnish Coating. Those six are surfaced by the backfill script, not silently flipped.
- **Sanity's single `Coating` Type spanned two of Eric's Types; it is now split** (approved 2026-08-26). The diagram separates **Spot Coating** (un-badged: *Spot UV/Spot Gloss*, *Spot Glitter*, *Raised Spot UV*, *Textured Spot UV*) from **Surface Coating** (*"Not Customizable"*: UV, AQ (Aqueous), Varnish, Soft-Touch, …). `split:coating-type` **renames** `type-coating-r2304` in place to *Surface Coating* (`coating` → `surface-coating`) so the three Options that stay put keep the same reference, **creates** `type-spot-coating-r2304`, and **repoints** *Spot UV*. Renaming the slug is safe: `customizationType.slug` appears in no route and no GROQ query — `/capabilities/**` builds its path from the **category** document (`CAPABILITY_BY_CATEGORY_AND_SLUG_QUERY`, `resolve-document-href.ts`), so no redirect is needed.
- **With §3, the Customization library's pages come only from the reference Types.** Nothing regresses, because `/capabilities/**` **is not served from this app at all** — but the route work must not be built to publish `configurable` Options.

  ⚠️ **Corrected 2026-08-28.** This clause originally read *"`/capabilities/**` currently returns 404 in production (site root and `/blog` return 200)"*, and offered that 404 as evidence the Next routes were inert. The 404 is real but it is **Magento's**, not this app's: nginx proxies to Vercel **per-prefix** — only `/blog` and `/case-studies` — so `/capabilities` and `/products` never reach Next at all. Verified by response headers: `/capabilities` returns `PHPSESSID` + `x-magento-tags: … cms_p_617` (Magento's 404 CMS page), where `/blog` returns `x-powered-by: Next.js` + `x-vercel-id`. The conclusion holds *more* strongly than the original reasoning did — those routes are unreachable, not merely broken — but the evidence was wrong and would have misled anyone treating the 404 as a signal about this codebase.
- **The product data source's `Detail Page` / `Capability URL Handle` columns are stale.** The Additional Customization sheet carries `Detail Page = Yes` on 67 of 68 rows with a handle assigned. Confirmed with Eric 2026-08-26: those handles were auto-generated, not a requirement, and do not constrain §3.
- **`role` is enumerated per-slug only while a Type is mixed.** `REFERENCE_SLUGS` in `backfill-customization-option-role.mjs` exists because one Sanity Type held both roles. With `Coating` split, every Type in the current data is single-role again, and the classification could follow the Type. It is deliberately left per-slug: D47 §2 holds that **a Type can be mixed** (Lamination will hold a customer-facing *Leather Lamination*), so a Type-derived rule would have to be unwound the first time that lands. The enumeration is the shape that survives.
- **The customer's own vocabulary loses its page.** *Matte finish* and *high-barrier pouch* are the highest-intent search terms and, as `configurable` Options, get no URL. `glossaryTerm` is intended to carry that vocabulary and the derived `achieves` reverse list — but it currently has **no route in `apps/www` or `apps/blog` and is rendered nowhere.** Building that surface is a prerequisite for the SEO position, not a follow-up, and is not yet ticketed.
- `role` is one field answering two questions — *does a customer pick this* and *does this document have a URL*. Raised and resolved in Eric's favour; recorded here because the coupling is the thing to revisit if a `configurable` Option ever needs a library page of its own (Leather Lamination is the candidate).
- **`blogPage.pageRole` is the naming precedent, not the pattern precedent.** `listingPage.ts` calls it "the `blogPage.pageRole` mistake" and the Rename Map retires it (null on 3 of 5 documents). The word `role` is settled; do not cite `pageRole` as an endorsed shape.
- `achieves` lists candidates, not a recipe. The non-sufficiency caveat lives in the **field description**, which is editor-facing, while the derived reverse list is customer-facing — *"High-Barrier — achievable by: PET, VMPET, LDPE"* still reads as *any of these gives you high barrier*. Whatever renders that list needs framing copy. Rendering concern, no schema change.

## Follow-on: Eric's schema review (D48)

Reviewed against the deployed schema 2026-08-26, vetted and settled as **D48** in `pakfactory-content-model/Decisions.md`. Seven items landed here; the rest were already built, already done, or withdrawn.

**Fixed**

- **`customizationType.cardinality` was `single`/`many`'s wrong twin** — it shipped `single`/`multiple` while `property.cardinality` shipped `one`/`many`. Two fields sharing a name and storing different vocabularies: invisible in the Studio (identical labels), only visible in code. Now `one`/`many` on both. ⚠️ The review called this schema-only; it is not — `cardinality` is **required**, so 23 live Types would fail validation, and the value feeds the registry's `spec_attribute.multi_select` projection.
- **`faqs` restored** — I had deprecated it as *"not in the designed field list"*, which was a **silence, not a decision**: no D-number removed it, nine other public-page types design it, and principle Q-D permits it. Now the shared `faqsField({ mode: 'mixed' })` — the same call Guide and Post make, so the members match by reuse rather than reimplementation.
- **The own-Type clash check did not exist.** The review read it as deployed-at-warning needing promotion to error; what was deployed was a *self-reference* check, a different thing. Built at **error** with D43's teaching message verbatim, because a bare rejection blocks the editor without showing them the field they actually wanted.
- **A comment that lied.** The old rule read *"Self-reference is an error; asymmetry is a warning"* and terminated in `.warning()` — so self-reference only warned. Split into two rules so the levels are real.
- `customizationType.order` deprecated · "Colour" → "Color" · the stale *"no banner image"* sentence removed · `canonical` → `canonicalUrl`, one definition in `lib/seo-fields.ts` serving 21 types.
- **`fact-labels.ts` lifted to `packages/sanity`** — the review asked whether the front end could import it or would have to duplicate the key→unit map. In `apps/studio/lib/` it could not without reaching into another app's internals. Now `@pakfactory/sanity/fact-labels`, one definition for the Studio and both front ends.

**Already built, contrary to the review:** the `availableOnProducts` warning does read `role` (its 🔴 do-this-first item); the `facts` rule already reads *"Each label may appear once"* at error level; and `fact-labels.ts` already carried `{ value, title, unit, symbol }` as separate parts.

**Also found, outside the review's scope:** 33 Options still carried `showThicknessTable` / `showFluteTypeTable` / `showColorRange` as orphaned document keys. Gone from the schema, still in the data — the review deliberately excluded documents, so it could not see them.

## Follow-on: the deprecated-field removal (Eric, 2026-09-01)

Eric audited every field carrying `deprecated` across the whole schema — **fourteen**, not the ten the D48 review listed — with a document count and a reader grep for each. **Nine came out.** The ADR records the two things that were decisions rather than bookkeeping, and the three corrections the audit needed.

**The one deliberate content loss: `customizationOption.whatIsBlock`.** Its 8 values are not placeholder — they are written definitions of SBS, FBB, CCNB, Kraft and the four laminations, each headed *"What is X?"*. Step 5 had held the field back precisely because `glossaryTerm` held 0 documents and removing it would destroy the only copy; that reasoning was right and is now **moot rather than solved**. Eric read the copy and chose to **discard** it: glossary content will be written fresh in PakFactory's voice, so carrying eight inherited paragraphs through a migration first buys nothing. 🔴 The earlier plan in `Rename Map.md:64` and `Entities/Glossary Term.md:47` — migrate them into Glossary Terms — is **superseded**; do not resurrect it from those documents, which still describe it. `glossaryTerm` itself stays: set on 0 of 33 Options, pointing at 0 documents, which is an unbuilt layer and not a fault.

**`comparedAgainst` was never a content question.** Step 5 kept it read-only on the grounds that 8 Options were populated and there was no successor, so removal would be "deletion, not migration". True, and irrelevant: each of the 8 held exactly three **references** to other Options, no prose, and the targets are mock documents due for replacement. The blocking reason was real but the thing it was protecting was not.

**Three things the audit did not have, found in implementing it:**

- **Seven desk panes ordered by `solution.internalTitle`** (`structure/index.ts` — the Solutions list and each of the four `solutionType` children, in two workspaces). The grep covered `apps/` and `packages/`; the Studio's own structure was outside it. Removing the field would have left every Solutions pane sorting by a key that no longer exists. Repointed to `title`, whose values are identical.
- **Drafts.** The counts were taken on the published perspective; the raw perspective adds 5 product drafts carrying `whatIsBlock`/`whyChooseBlock` and 4 carrying `comparedAgainst`. Publishing any of them restores the key, so the unset covers drafts — 69 patches, not 60.
- **`solution.internalTitle` is guarded rather than assumed.** `migrate:solution-titles` copied all 30 values and left the source in place; the unset is only safe because `title` matches. The script verifies that per document and **refuses to write** if any Solution's `title` is missing or differs, rather than trusting the earlier migration's own report — the BUG-0032 lesson applied to someone else's green tick.

**The `expertiseStage.order` banner is corrected.** The audit opened with a 🔴: *"a live query sorts by numbers you documented as wrong"* — `CASE_STUDY_FILTER_OPTIONS_QUERY` does `order(order asc)` over a field whose own deprecation reason says the numbers are the old, wrong sequence. The query is real and the sort was wrong. It is **not live**: it is exported from `queries.ts` and imported by nothing, because `case-study-listing-grid.tsx` derives its filter options from the studies it already holds (`deriveOptions(studies, "expertiseAreas")`). This is the same trap the `apps/www` dead-query cluster sets — a grep hit that reads as a consumer. Repointed to `title asc` anyway and annotated, which also makes `expertiseStage.order` inert like its three siblings, so all four `order` fields now come out as one job with PROD-2292.

**Still blocked, and why:**

| Field(s) | Blocked on |
| --- | --- |
| `customizationType.order` · `property.order` · `propertyValue.order` · `expertiseStage.order` | **PROD-2292** — the listing/nav singleton that holds ordering does not exist. One job, four fields. |
| `productStyle.order` | Its replacement `productLine.styles` is **empty on all 14 lines** while this field is set on 8 styles. Correct in design, holds nothing — removing it today deletes the only ordering that exists. Populate first. |

The three mock-product fields (`whatIsBlock`, `whyChooseBlock`, `comparedAgainst` on `product`) were removed with the rest rather than deferred to the product re-seed: nothing reads them, all 26 products are mock and due for wholesale replacement, and leaving them means the same sweep runs twice.

## The five `order` fields, and why the blocks did not survive checking (2026-09-01)

Eric's removal plan held five fields back — four "waiting for PROD-2292", one waiting for `productLine.styles` to be populated. Richard asked what each was actually blocked on. **Four of the five blocks were weaker than stated, and two were not blocks at all.** All five are removed; the values are recorded below because that is the only thing the deprecation was really protecting.

**Nothing read any of them.** No GROQ query in `packages/sanity`, `apps/www` or `apps/blog`; the registry exporter's `order` comes from Postgres `sort_order`, never from Sanity. Three Studio **desk panes** did sort by them — `propertyValue` in two workspaces and the `expertiseStage` list — and are repointed to `title`, the same class of miss as the seven Solution panes caught a day earlier.

| Field | Stated block | What checking found |
| --- | --- | --- |
| `customizationType.order` (14) | "the listing/nav singleton (PROD-2292)" | 🔴 **No such successor.** PROD-2292 builds 19 standing pages and **none is a customization or capabilities listing.** The field was deprecated toward something nobody specified. |
| `propertyValue.order` (32) | same | 🔴 **No successor by design.** `listingPage.filters` states that *"the VALUES inside each filter are always derived from the content — never listed here."* Value order was designed away, not relocated. |
| `property.order` (9) | same | **Real, and narrower than stated.** `listingPage.filters` is an ordered array of Property references and is **already deployed**; what is missing is the listing-page *documents* — 1 of 19 exists (`caseStudiesPage`). |
| `expertiseStage.order` (6) | same | The stored numbers are the **known-wrong** sequence, as the field's own deprecation reason said. Removing them loses nothing that should be kept. Successor is `expertisePage.featured` (type deployed, document not yet created). |
| `productStyle.order` (8) | "`productLine.styles` is empty on all 14 lines" | True and materially trivial. `productLine.styles` is *"never a gate — unlisted styles append alphabetically"*, so empty is defined behaviour. Of the three lines that have styles, **two order identically under the fallback**; the whole loss is the sequence of three mock Folding Carton styles. |

**`productStyle.order` was for the styles grid on a Product Line** — the order the style cards appear in on a line's page. That role is `productLine.styles` now. It has never had a reader: `/products` is served by Magento, not this app.

### The values, recorded before deletion

`customizationType.order` — Material: Paperboard 1, Corrugated 2, Kraft Paper 3, Flexible Film 4 · Printing: Offset 1, Digital 2, Flexography 3 · Finishes: Embossing & Debossing 0, Lamination 1, Surface Coating 2, Spot Coating 2, Foiling 3 · Additional Customization: Die Cutting 2, Window Patching 3. (Surface Coating and Spot Coating collide at 2 — an artefact of the Coating split.)

`property.order` — Source 1, Physical Properties 2, Performance 3, Aesthetic 4, Color 5, Opacity 6, Sustainability 7, Role 8, Finish Type 9. **This is the one sequence nothing else records**; re-apply it to `catalogPage.filters` when the listing pages are created.

`propertyValue.order` — Source: Virgin Fiber, Recycled Fiber, Mixed Fiber · Physical Properties: Coated, Uncoated, Smooth, Textured, Printable · Performance: Moisture Resistant, Tear Resistant, Food Safe, Grease Resistant · Aesthetic: Premium Look, Natural Look, Bright White · Color: White, Natural Brown, Black · Opacity: Opaque, Translucent, Transparent · Sustainability: Recyclable, Biodegradable, Compostable, FSC Certified, Recycled Content · Role: Outer Layer, Barrier Layer, Sealant Layer · Finish Type: Matte, Gloss, Soft Touch.

`expertiseStage.order` (the wrong sequence, for the record only) — Strategy 1, Design 2, Prototyping 3, Managed Manufacturing 4, Logistics 5, Fulfillment 6. Eric's real order is Design → Prototyping → Managed Manufacturing → Strategy → Logistics → Fulfillment.

`productStyle.order` — Rigid Boxes: Magnetic Closure, Neck Box, Telescoping Box · Folding Cartons: Straight Tuck End, Reverse Tuck End, Auto Bottom (123) · `[Test]` Mailer Boxes: Regular Slotted Container, Snap-Lock Mailer.

### 🔴 One open question this surfaces, for Eric

If a listing filter's values must render in a meaningful order — *Matte → Gloss → Soft Touch*, not *Gloss → Matte → Soft Touch* — then `listingPage.filters` deriving values from content with no ordering is a gap, and the same is true of ordering Customization Types within a category. Neither has a home in any current spec. This is a design question, not a field to restore.

**With this, the schema carries zero deprecated fields.**

## References

- `pakfactory-content-model/Decisions.md` — **D47** (authoritative), D42–D48. 🔗 **That register and this one are the two halves of the record: model decisions live there, Studio implementation decisions live here.** Neither is complete alone — cite both.
- `Capabilities Flow` (Eric, 2026-08-26) — the Type-level `role` badges; **authoritative for classification**
- `pakfactory-content-model/POC/explainers/availability-axes-and-role.html` — reasoning and diagrams
- `pakfactory-content-model/Entities/Customization Option.md` · `Customization Type.md`
- [PROD-2250](https://dotdirect.atlassian.net/browse/PROD-2250) · [PROD-2295](https://dotdirect.atlassian.net/browse/PROD-2295)
- `pakfactory.com-backend/db/registry/` — `rule_scope`, ADR-0008 #10 option C
