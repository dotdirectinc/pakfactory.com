# ADR-022: The customization model after the four-field retirement — rules are computed, not stored

**Status:** **Accepted** (2026-09-24). Decisions **1–5 describe what shipped**; **6–7 were implemented in PROD-2595 (pakfactory.com #630) with Richard's answers to the four open questions, and confirmed 2026-09-24**. **Supersedes [ADR-017](0017-customization-availability-axes-and-role.md) § 1** (the four availability fields) and the Registry-ownership premise ADR-017 rests on. ADR-017's §§ 2, 3, 5 and 6 are untouched — see "What ADR-017 keeps".

## Context

ADR-017 settled the customization model as **D47** on 2026-08-26 and is still the register's read-first for *Product customization model*. Since then six changes have moved the model out from under it, and **none was recorded as an ADR**. A reader who follows the register today gets a model that no longer exists.

| When | What changed | Recorded in |
|---|---|---|
| 2026-09-13/14 | `cardinality` → `customerSelects`; four Type fields removed | PROD-2481, PROD-2482 |
| **2026-09-17** | **All four ADR-017 availability fields removed**, replaced by two | PROD-2538, `efef4a5` |
| 2026-09-17 | `product.availableCustomizations` becomes the sole product-axis writer | PROD-2529 |
| **2026-09-18** | **Sanity owns the rules after the one-time fill; the registry becomes a history log** | PROD-2559, decision recorded in the vault only |
| 2026-09-18 | `availabilityDecidedBy` added as the discriminator | PROD-2532 |
| 2026-09-22/24 | `dependsOn` added; one shared rules package | PROD-2557, PROD-2558 |

The two that *contradict* ADR-017 rather than extend it are the 09-17 field removal and the 09-18 ownership reversal. ADR-017 § 1 states availability lives in four axis-scoped fields; it does not. ADR-017's context states `product.availableCustomizations` *"becomes Registry-owned and read-only (PROD-2295, decision b)"* and reasons from that; it does not, and the reasoning it supports needs restating on the current premise.

Until now the only place recording any of this was `pakfactory.com-backend/docs/spec-studio-alignment.md` § 2a, which is in a different repo and flags ADR-017 as *"partly superseded"* without saying what replaces it.

## Decision

### 1. Two fields, not four — and the empty semantics **invert**

| ADR-017 (retired) | Now |
|---|---|
| `availableOnProducts`, `exceptProducts` | `product.availableCustomizations` |
| `worksOnCustomizations`, `incompatibleWithCustomizations` | `customizationOption.compatibleCustomizations` |

`compatibleCustomizations` is **one flat list of option ↔ option pairs, read from both ends**, with no Type targets and no deny-list. The schema's own reasoning: *"The spec system will own compatibility and push it whole"* — a machine-written flat list is idempotent and diffable, where a Type reference forces the sync to decide when to collapse N options into one.

**ADR-017 D47's "empty means no restriction" is reversed on the Studio side for this axis.** Empty `compatibleCustomizations` now means *compatible with nothing* — it **fails closed**. This is the single most consequential difference and the one most likely to be got wrong by someone reading ADR-017.

The registry keeps the opposite convention on purpose, so the two systems are not symmetric:

| | empty means |
|---|---|
| registry `value_works_on` | no restriction — fails **open** |
| Sanity `compatibleCustomizations` | compatible with nothing — fails **closed** |
| Sanity `dependsOn` | nothing narrows this type — a **warning**, not an error |

### 2. Sanity owns the rules; the registry is the history log

ADR-017 reasoned from the Registry owning `availableCustomizations` and rendering it read-only. **That is reversed.** After the one-time fill, Sanity is the source and the shared package computes from it; the registry records history via a publish webhook (PROD-2559), and the board path retires.

The practical consequence, and the reason it matters here: a rules change is a **content edit**, not a deploy. That is what makes decision 7 possible.

### 3. `availabilityDecidedBy` is the discriminator

`product` — each product lists which of these options it offers. `customization` — the material or process it goes on decides, and these never appear under a product's available customizations.

It lives on the **Type**, not the Category, and that is load-bearing: Finishing is mixed — Food-Safe Treatment is product-decided while the other seven are not — so a Category-level answer could only be given by splitting Finishing in two, which would make the taxonomy serve the configurator instead of describing what things are.

It has **no `initialValue`**, deliberately. No default is safe in both directions: a Type wrongly left on `customization` is *invisible* — its options silently never reach any product's picker.

### 4. `dependsOn` carries direction, and is derived rather than authored

`compatibleCustomizations` is read from both ends, so it can say Spot UV and Matte go together and **cannot** say which decides the other. Nothing else in the model carries direction, so without `dependsOn` the rules engine must be told the order by its caller and every caller must agree.

An entry may be a **Category or a Type**, because the board states it both ways: *"Material dictates Printing Method"* is all sixteen material types (naming them one by one would be wrong the day a seventeenth arrives), while *"Colour System depends on Printing Method"* is one type. Read **ALL-OF across entries, ANY-OF within one**.

**Amended 2026-09-24 (PROD-2595, approved by Eric and Crystal): `dependsOn` is a list of requirements.** Each entry is `{ anyOf: [category | type, …] }`: every requirement must be met, and a partner in any one of its entries meets it. The flat list could not say which deciders are alternatives — Spot Coating's *Lamination, Surface Finish, Surface Finish (non-paper)* read as three requirements, so it needed a paper and a non-paper finish at once and was offered nowhere. The board already says which: lines drawn in **one frame** are alternatives, lines in **two frames** are two requirements — the rule the registry engine applies (`worksOnDimension`) — so the fill writes one requirement per frame. Printing Method = (Materials) and (Ink); Spot Coating = (Lamination or Surface Finish or Surface Finish (non-paper)). A category entry expands to its member types *within* its requirement, so "Materials" is met by whichever material the product has.

**Which to emit is derived, not hand-written.** It follows from the *decider's* own `availabilityDecidedBy`: a product-decided axis is named by its **category**, a customization-decided one by that **type**. That single rule reproduces all three worked examples in the field's own description, and it is why a seventeenth material needs no edit here.

Registry coverage is deliberately **not** the signal. Surface Coating is gated by Foam alone today — but that is which materials *permit* it, which the works-on rows already state. `dependsOn` says only *"ask the material first"*.

### 5. One shared package computes for three readers

`@pakfactory/sanity/customization-rules`, consumed **source-level** via `workspace:*` by Studio, www and admin. Three copies of this logic is how they drift.

Resolution is a **fixpoint, not one pass** — removing an option can remove the option that depended on it. And a later selection can invalidate an earlier one, in which case the earlier choice is **removed *and* reported**: silently dropping it produces a spec the customer never agreed to, silently keeping it produces one that cannot be made.

**Amended 2026-09-25 (PROD-2556): picks check each other, pair by pair — "not ticked" is incompatible.** `compatibleCustomizations` is **complete for every two options a product offers together**: the backend fill (`relationship-fill.ts`) asked the registry's own engine — Crystal's 20 `exclude` rules included — whether each option survives the other on every product offering both, and ticked the pair when it did on at least one. An unticked pair between two options one product offers is therefore a real clash (Soy-Based × Water-Based Ink, Soft Touch × Blind Debossing), never an undrawn one. Pairs no product offers together are unticked too, but never meet in one configurator. So `resolveWithSelections`:

- hides, once an option is picked, every option it is not paired with — in any Type, including its own when that Type is `customerSelects: many` (a `one` Type's alternatives stay listed, so the customer can switch). Requirements alone never saw these clashes: they read pairs only along `dependsOn`, and never within a Type;
- skips options with **no pairs at all** on both sides — empty there means "nothing recorded" (an Add exception, a hand-made option), not "clashes with everything";
- takes clashing picks (only reachable from a preset or a saved request, since the configurator hides clashes) in order: the earlier stands, the later is invalidated with `conflictsWith`;
- with `lookahead` (the configurator's mode), lists an option only if picking it invalidates nothing — two picks can each be fine alone yet leave no board that takes both.

**No `excludes` field** (Richard, 2026-09-25): the compatible lists already carry the excludes; a second field would state them twice.

### 6. Availability is direct ∪ derived — and the derived half is displayed, never stored

✅ **Accepted 2026-09-24 — implemented in PROD-2595 (#630).** The product's Customization tab shows a read-only **Derived** section, computed by `resolveForProduct`, with the partner that keeps each option. Nothing derived is stored.

`availableCustomizations` stores **one hop only**. Everything following from it — a lamination the material allows, a printing method the ink allows — is computed.

**The stored field stays direct-only and stays the sole writer**; the derived half is rendered read-only beside it with the reason each option is derived. Storing it would reintroduce the two-writer problem PROD-2529 settled, go stale the moment a rule changed, and turn a rule change into a data migration across ~310 products rather than a recomputation.

This un-parks what PROD-2529 listed as out of scope (*"the derived read-only Finishing / Printing lists — parked"*) while upholding the decision that ticket made.

### 7. `customizationExceptions` overrides per product, in **both** directions

✅ **Accepted 2026-09-24 — implemented in PROD-2595 (#630).** The four questions PROD-2595 left open were answered by Richard on 2026-09-24:

| Question | Answer |
|---|---|
| Shape | **One array** of `{customization, mode: 'add' \| 'remove', reason}`. Two arrays would answer one question in two places. The reason is required. |
| Target | **Option only**, and only an option whose Type another customization decides. A product-decided option is already the product's to list in `availableCustomizations`; a Type-level exception would be the coarse enumeration D61 and D62 removed. |
| Precedence against a hard exclude | **An Add is never blocked, and always flagged.** Crystal's exclude rules reached Sanity as missing pairs in `compatibleCustomizations`, and the registry's rule API is paused. *(Corrected 2026-09-25 — see decision 5: those missing pairs are reliable wherever two options meet on one product, and the configurator now enforces them. An Add is still never blocked, because an added option has no pairs of its own to check.)* So every Add carries a Studio warning to confirm with production, and the product appears on the exceptions list. Bringing hard excludes into Sanity as their own field was considered and not taken: it would reintroduce an explicit incompatibility list, which D62 removed. |
| Report | **Yes.** A Studio list, *Products with Exceptions*, in the Products workspace now; admin gets its own with PROD-2560. |

How the rules apply it: a **Remove** comes out before the rules settle, so what depended on it cascades out too; an **Add** is pinned, so the rules never take it back and what depends on it can pair with it. Each exception reports its effect against the rules alone — `added`, `removed`, or `redundant` when the rules already agree — and an Add says why the rules left the option out.

A per-product override for cases the rules get wrong. It must **subtract** (the rules derive an option this product cannot take) **and add** (the rules exclude one it does offer). A deny-list alone misses the second case; widening `availableCustomizations` is wrong for it, because a direct entry there asserts the product decides that type — false for a Finishing option the material decides.

**Why a field rather than a rule change.** An exception is **data**, so it takes effect on publish. The same carve-out encoded as a rule changes the answer for *every* product sharing that material, and a change to the shared logic itself means redeploying the package to Studio, www and admin. A one-product exception must not require either.

This does **not** resurrect `exceptProducts`, which ADR-017 retired on the grounds that *"a carve-out only earns its place where you enumerate coarsely"*. This one carves against a **computed** result, per option rather than per tier.

## What ADR-017 keeps

- **§ 2** `role` on the Option, not the Type — still holds; the field is `configuratorRole`
- **§ 3** a configurable Option has no detail page
- **§ 5** one scope algebra
- **§ 6** the model-vs-renderer tiebreaker
- **§ 4** the Surface Finish split by material family — still in place, though ADR-017 § 4 already noted it was a workaround for a constraint the compatibility axis now holds properly. Whether the two Types should become one is **open**, and this ADR does not settle it.
- **§ 4b** `cardinality` — unchanged in meaning, **renamed** to `customerSelects` (PROD-2482) to end a collision with `property.cardinality`, which counts something else entirely.

## Consequences

**A reader of ADR-017 alone will get the compatibility default backwards.** That is the reason this ADR exists and is why the register row for 017 must point here.

**Empty is dangerous in a way it was not.** With Sanity failing closed, an unfilled `compatibleCustomizations` means "combines with nothing" rather than "not yet authored" — so the fill must land before any configurator reads it, exactly as PROD-2529 flagged for its own field.

**A rules change is a content edit.** No deploy, no migration; it recomputes. The cost moves to making sure the *computation* is right, which is what the shared package's 58 tests and the registry-derived `dependsOn` are for.

**Three Sanity types had no registry attribute** — `Digital Printing`, `Flexography` and `Offset Printing` existed as Types in Sanity and as `printing_method` **values** in the registry. The development catalog rebuilt from Notion on 2026-09-24 no longer has them; production still does until it is rebuilt the same way.

## References

- [ADR-017](0017-customization-availability-axes-and-role.md) — superseded in part
- PROD-2529 · 2532 · 2534 · 2538 · 2557 · 2558 · 2559 · **2595**
- `packages/sanity/src/customization-rules/README.md`
- `pakfactory.com-backend/docs/spec-studio-alignment.md` § 2a
- `pakfactory.com-backend/scripts/lib/depends-on.ts` — the `dependsOn` derivation
