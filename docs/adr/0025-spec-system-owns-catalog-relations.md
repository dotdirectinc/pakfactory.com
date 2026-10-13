# ADR-025: The Spec System owns catalog relations, edited through reviewed frames

**Status:** **Proposed** (2026-10-13) — decision taken by Richard on 2026-10-09; becomes Accepted when Richard accepts this record. **Amended 2026-10-13** (Richard): the approved Spec System change wins over Studio (§ 3 "Write", § 2 switch timing) — see "Amendment 2026-10-13". **Supersedes [ADR-022](0022-customization-rules-computed-not-stored.md) § 2** ("Sanity owns the rules; the registry is the history log"). ADR-022 §§ 1 and 3–7 stand — see "What ADR-022 keeps". Applies to `admin`, `studio`, `www` (read side unchanged) and the Spec registry (`pakfactory.com-backend`). Tickets: PROD-2959 and its sub-tasks.

## Context

PROD-2959 adds two read-only views of the catalog to Spec System in the admin — the **Catalog** tables and record pages (PROD-2926) and the **Spec Map** diagram (PROD-2960) — and then asks for **editing relations** from both.

Where those relations live has already changed twice:

| When | Owner of availability / compatibility | Record |
| --- | --- | --- |
| ADR-017 | The **registry**; Studio read-only | ADR-017 context (PROD-2295 decision b) |
| 2026-09-18 | **Sanity**; the registry becomes a history log | ADR-022 § 2 (PROD-2559) |
| 2026-10-09 | **The Spec registry**, edited from Spec System | This ADR |

Facts that shaped the decision (verified 2026-10-09/13):

- **The rules live in five Sanity fields**, and nothing else: `customizationType.availabilityDecidedBy` (+ `customerSelects`), `customizationType.dependsOn`, `customizationOption.compatibleCustomizations`, `product.availableCustomizations`, `product.customizationExceptions`.
- **The shared package holds no rule data.** `@pakfactory/sanity/customization-rules` (ADR-022 § 5) is the calculation only. Studio (the product's Derived panel), www (configurator, offer index) and admin (Current rules, rules views, Spec Map) all run it on whatever those fields hold. A change to the fields changes every reader at once.
- **The history log of ADR-022 § 2 was never built.** Sync Changes (Sanity → registry) carries product ↔ style and product ↔ solution links and names/status, but none of the five rule fields; no publish webhook records them. The registry holds no rule history today.
- **The registry's own rule tables describe a different model.** `spec_rule` / `rule_*` / `scope_*` / `value_works_on` came from the board generator; `value_works_on` treats empty as *no restriction* (fails **open**, ADR-022 § 1 table), the opposite of Sanity's fails-closed `compatibleCustomizations`. They are not fed from Sanity and no longer match what the site offers.
- **A frame already writes to Sanity.** Approved `sanity_document` changeset items are applied by the backend worker, which compares each field with the value the frame saw and marks the item **stale** instead of overwriting a newer edit.
- **A rule edit reaches far.** One compatibility pair can change what hundreds of products offer, through `dependsOn` cascades; an option moved to a type decided the other way silently stops being offered by every product that listed it. Studio shows neither the reach nor the consequence before publish.

## Decision

### 1. The Spec registry owns catalog relations — rules first, structure later

The registry becomes the source of truth for **relations**, starting with the **rules** (the five fields above). **Structure** — parents (line → style → product; category → type → option; solution → solution style → inspiration product) and properties — moves the same way afterwards, under its own decision (see § 7).

Sanity keeps the rule fields as a **pushed copy**: every reader (Studio, www, admin) goes on reading Sanity, and the shared package is unchanged. Content (names, copy, media, SEO) stays owned by Sanity.

### 2. One writer per field, after a trial

Two editable sources for one field is the problem this ADR exists to end. The switch is made in two stages:

1. **Trial** — Studio stays editable. Studio edits reach the registry through Sync Changes (extended to the rule fields, PROD-2986), so the registry stays current. Conflicts are caught, not silent (§ 4).
2. **Switch** — as soon as the first end-to-end test passes on development (amended 2026-10-13; was "after a trial"), behind a flag that can make the fields editable again: the rule fields become **read-only in Studio** ("Edited in Spec System", with a link), and Sync Changes stops proposing them (PROD-2988). A **drift check** — every rule where the registry and Sanity disagree — stays as an alarm.

The read-only switch is deliberately **last**: until Spec edit → approve → push → visible in Studio and on the site is proven, Studio remains the way to change a rule. It follows that proof directly rather than a long trial: every conflict below exists only while both systems can edit a field.

### 3. Edits are reviewed frames, with an impact check

Relations are edited in Spec System, in **both** views — the Catalog record page and the Spec Map panel render the **same** record view, so they share one editor. Who may edit: **approvers and admins**. Removing a relation removes the link; nothing is erased.

Each set of edits becomes **one frame** (the same changesets as every other catalog change):

- **Impact check before the frame exists.** The admin runs the shared package on the catalog with and without the pending edits and shows which products gain or lose which options. **Blocking errors** (Studio's hard rules: no self-pairs or repeats, no two options of a one-choice type paired, exceptions only on customization-decided types, required references exist) prevent submitting and are re-checked by the server. **Warnings** need an explicit "I understand": products losing options, an exception becoming redundant or conflicting, inspiration pre-selections no longer offered, an option left with no compatible partner. The impact is stored with the frame and **re-computed when the frame is reviewed**, so the approver decides on current facts.
- **Approval** — by an approver, or **Submit & approve** in one step for approvers and admins (recorded as both).
- **Write** — the registry is updated, then the change is **pushed to Sanity immediately** (not on the worker's next tick). **The approved change wins** (amended 2026-10-13): the frame carries the change itself — set a value, add or replace one entry, remove one entry — applied to the published document and its draft as they are when written, so a colleague's change to another entry is kept and only what the edit names is forced. A Studio change to those entries made since the proposal is **shown to the approver before approving**, then overridden and **recorded on the item** so it can be put back. Nothing is overwritten silently. *(Was: the item became stale and Sanity's value was kept.)*

The cost against today's Studio path (publish → live) is the approval step; with Submit & approve an approver's change is live in about the time a Studio publish takes.

### 4. The registry mirrors Sanity's rule model one-to-one

New registry tables mirror the five fields exactly — each type's decided-by and one-or-many; a type's requirements (groups of types or categories, ADR-022 § 4 shape); compatible pairs, stored once per pair and read from both ends; a standard product's directly offered options; product exceptions (add / remove, reason) — with **Sanity's semantics, empty fails closed**. A one-time import loads today's values (PROD-2961).

Mirroring the fields, not translating them into the old rule model, means the shared package gives the same answer from either side; the backend can use it as a consistency check.

The old rule tables (`spec_rule`, `rule_condition`, `rule_target`, `rule_scope`, `scope_attribute`, `scope_value`, `value_works_on`) are **retired as a rules source** — kept, not deleted, not read for availability.

### 5. The calculation stays in the shared package

The rules logic is not moved into the registry database and not duplicated in the backend. Two implementations of "what can a product offer" is how they drift (ADR-022 § 5). If the registry ever needs availability answers (pricing, the vendor portal), it stores the package's **results** as a read-only snapshot stamped with when they were computed — it does not author them.

### 6. Development first

Everything above runs on the **development** dataset. Production follows PROD-2963 (blocked by PROD-2596).

### 7. Not decided here

- **Structure.** Moving parents and properties to the registry needs one more decision: how a record created in Studio gets its parents (set on create in Studio and changed only in Spec System afterwards, or created from Spec System). It gets its own record: settled by [ADR-026](0026-spec-system-owns-catalog-structure.md) (Studio creates with parents; the Spec System moves).
- **Studio's input to the package.** Studio's Derived panel feeds the package every option, active or not, while www and admin feed active options only, so Studio can show availability the site does not. A separate fix, not a change to this decision.

## Amendment 2026-10-13 — the approved change wins

Decided by Richard on 2026-10-13, after the four trial cases were checked against the code:

| Case | Behaviour |
| --- | --- |
| A Studio draft exists when an edit is submitted | Allowed; the change is applied to the draft as well as the published document |
| Studio changes the entry between submit and approval | Shown to the approver ("approving overrides …"); on approval overridden and recorded |
| Studio changes the field after the write | Stands; the next Sync Changes proposes it. Prevented only by the switch |
| A Sync Changes frame proposed **before** an approved edit is approved **after** it | Refused — the most recent proposal wins, not the most recent approval |

Notion frames are unchanged (stale, never overwritten). The switch (§ 2) follows the first end-to-end pass on development. Implemented by `pakfactory.com-backend` #341 (`sanityOps.ts`, `approve_changeset` check, `changeset_item.overrode`).

## What ADR-022 keeps

| ADR-022 | Status |
| --- | --- |
| § 1 Two fields; empty **fails closed** | Stands — and the registry mirror adopts it |
| § 2 Sanity owns the rules; registry history log | **Superseded by this ADR** |
| § 3 `availabilityDecidedBy` is the discriminator | Stands — now a registry-owned field |
| § 4 `dependsOn` carries direction (requirements) | Stands — now a registry-owned, editable rule |
| § 5 One shared package for three readers | Stands — and is what the impact check runs |
| § 6 Direct ∪ derived; derived displayed, never stored | Stands |
| § 7 `customizationExceptions` both ways | Stands — now a registry-owned field |

## Consequences

**A rules change is a reviewed change.** Every edit carries its reach before it is approved, and the registry holds who changed which rule, when, through which frame — the history ADR-022 § 2 intended and never got.

**Slower than publish, by one step.** Studio's publish → live becomes edit → approve → push → live. Submit & approve keeps an approver's change close to publish speed; anyone else's waits for review, which is the point of review.

**One more system to keep in step during the trial.** Until the switch, a Studio edit made after a Spec System edit was proposed is overridden when that edit is approved — shown to the approver first and recorded. A Studio edit made after the write stands until someone changes it again; only the switch prevents that. The drift check makes any divergence visible.

**Other writers must route through the registry.** After the switch, scripts that patch rule fields (e.g. `relation-correction`) go through the registry; Notion sync never touched the rule fields and is unaffected.

**Ownership docs move with it.** The backend's `docs/catalog-ownership-map.md` gives the rule fields to the registry; `db/registry/data/ownership/catalog-ownership.json` follows at the switch.

**Reversible until the switch.** Before PROD-2988, abandoning this decision means dropping the new tables and the edit path; Studio never stopped working.

## References

- [ADR-022](0022-customization-rules-computed-not-stored.md) — the model this keeps (§§ 1, 3–7) and the ownership it supersedes (§ 2)
- [ADR-017](0017-customization-availability-axes-and-role.md) — the earlier registry ownership
- `packages/sanity/src/customization-rules/` — the shared package (`resolve.ts`, `dependencies.ts`, README)
- `pakfactory.com-backend`: `src/services/catalogSync/sanityApply.ts` + `sanityOps.ts` (frame → Sanity: ops applied to the current document, overrides recorded), `scripts/lib/sanity-sync.mjs` (Sync Changes), `docs/catalog-ownership-map.md`
- Tickets: PROD-2959 · PROD-2926 (Catalog) · PROD-2960 (Spec Map) · PROD-2961 (registry rule tables + import) · PROD-2986 (Sync Changes carries rules + drift check) · PROD-2987 (rule edit API, immediate push) · PROD-2962 (editing UI + impact check + end-to-end test) · PROD-2988 (read-only switch) · PROD-2963 (production)
