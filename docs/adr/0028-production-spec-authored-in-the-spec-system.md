# ADR-028: The production spec moves into the Spec System one collection at a time, on Justin's engine and design

**Status:** accepted (2026-11-18). Decided and owned by Richard Qin, after the [production and dev meeting with Justin Chow](https://dotdirect.atlassian.net/wiki/spaces/Pakfactory/pages/437813249) the same day, and revised the same day after a design challenge (revision 2). D2 amended 2026-11-19: the engine runs in the Registry API only. Justin Chow (production spec owner) confirmed his Spec Library code may be reused.
**Date:** 2026-11-18
**Owner:** Richard Qin
**Jira:** under [PLAT-30](https://dotdirect.atlassian.net/browse/PLAT-30) (PakFactory Spec DB). Built in [PLAT-84](https://dotdirect.atlassian.net/browse/PLAT-84) (Registry API), [PLAT-85](https://dotdirect.atlassian.net/browse/PLAT-85) (library review), [PLAT-86](https://dotdirect.atlassian.net/browse/PLAT-86) (mapping editing) and [PLAT-87](https://dotdirect.atlassian.net/browse/PLAT-87) (spec engine). It changes [PLAT-51](https://dotdirect.atlassian.net/browse/PLAT-51), [PLAT-52](https://dotdirect.atlassian.net/browse/PLAT-52) and [PLAT-81](https://dotdirect.atlassian.net/browse/PLAT-81). Related: [PLAT-19](https://dotdirect.atlassian.net/browse/PLAT-19) (vendor product onboarding), [PLAT-83](https://dotdirect.atlassian.net/browse/PLAT-83) (job specs).
**Applies to:** `admin` · the spec engine in `pakfactory.com-server` · Spec registry (`pakfactory.com-server`; Registry DB schemas `spec_production`, `spec_workflow`, `spec_mapping`)

**Numbering note:** first drafted on 2026-11-18 as platform ADR-0021 (vault and Confluence). It was moved here the same day because it is a Spec System decision, like [ADR-025](0025-spec-system-owns-catalog-relations.md) and [ADR-026](0026-spec-system-owns-catalog-structure.md). Platform ADR-0021 is withdrawn, and that number is free again.

**Conforms to:**
- [ADR-025](0025-spec-system-owns-catalog-relations.md) and [ADR-026](0026-spec-system-owns-catalog-structure.md): the Spec System already owns catalog relations and structure. This ADR extends that ownership to the production side.
- Platform ADR-0008 Product Spec Management System: the Registry holds the spec model.
- Platform [ADR-0017](https://dotdirect.atlassian.net/wiki/spaces/Pakfactory/pages/427753527) and PLAT-42: a new record gets a generated ID and code.
- Platform [ADR-0020](https://dotdirect.atlassian.net/wiki/spaces/Pakfactory/pages/428376065) D6: the production side of the spec lives in the Registry first, then moves to Aurora (PLAT-5).
- The PFP-109 / PLAT-30 proposal (Confluence 427589664): approval is the gate for releasing a job spec revision to a vendor (section 6b).

## Context

- **How it works today.** The production spec is Justin's Spec Library, a browser tool he built and edits himself. As manager of design and operations, Justin is its real user and owner: it encodes how production data is used day to day. Its export (2026-11-12, library version 1) was imported into the Registry (PLAT-50). PLAT-81 brings later exports in: records nobody approved take the new values, and changes to approved records wait as held changes. The Spec System's review pages are read-only: *Production library* takes a decision on every record (458 for folding cartons), and *Mapping* on each map from Terence's draft.
- **What Justin asked for (meeting, 2026-11-18).**
  1. Include solutions and inspirational items.
  2. Show a preview image.
  3. Allow creating and remapping.
  4. Edit capabilities and their values (text, numbers).
  5. Give the All records navigation more structure.
  6. Make the approval view more intuitive.

  He also asked whether the Spec System can do everything his Spec Library does.
- **What Richard wants (after the meeting).** The library review should show what is new per product type, so that it can also serve vendor onboarding (PLAT-19). An admin auditor can add, change and remove records. Mapping review lets the auditor pick another product or preset from a list, or add a new one.
- **What his Spec Library is (read from its code on 2026-11-18).** One page in three parts:
  - **The logic** (about 900 lines of pure functions): template inheritance, rule outcomes, compatibility, regional materials, substitution, spec validation and the spec document.
  - **The screens:** editors for every collection, a spec preview and a validation suite. Written in Preact, loaded from a CDN, about 1,500 lines with no automated tests.
  - **A storage class.**

  The storage class shows that the tool was built for one person:
  - All 11 collections are loaded into the browser.
  - A save computes the new version from the browser's own copy and overwrites the record, so the last save wins.
  - The change log is written after the save, and any error is ignored.
  - Field checks run only in the browser.
  - Delete is a hard delete.
  - There is one permission: can the user write or not.
- **A design challenge on the first version of this ADR** (same day) found five problems:
  - Records created from a map were both "approved by saving" and "New for review".
  - Freezing library versions broke the version pins that maps already carry.
  - Switching off imports at once left rules, templates and materials with no editor anywhere.
  - Approval per product type clashed with records shared across a line (one capability serves all 9 folding carton types).
  - Removing review contradicted vendor onboarding, which needs vendors to *propose* and PakFactory to *review*.

  This revision answers all five.

## Decision

### D1: Justin owns what the tool does; development owns how it is built

Justin's Spec Library is the design specification: its collections, fields, workflows and checks say what the Spec System must do. Development rebuilds it on the platform's own stack and may combine, simplify or re-arrange it where that serves the same workflow. Justin signs off each rebuilt screen against his tool before that screen replaces it.

### D2: Reuse his logic as one tested engine, in the Registry API

His logic becomes a typed, tested engine with as few changes as possible. His validation-suite test cases become its automated tests, so it keeps doing what he expects. The engine runs in the Registry API (`pakfactory.com-server`):
- to check every write, whoever or whatever makes it;
- to answer the admin's previews and checks. The admin calls the API (`/v1/spec-library/*`) and holds no copy of the logic.

Later it also builds job specs (PLAT-83). Nothing else reimplements this logic. Justin confirmed on 2026-11-18 that his code may be reused.

**Amended 2026-11-19 (Richard Qin).** Revision 2 also ran the engine in the browser, which needs a copy of it in this repository. This repository is public, so that copy would publish Justin's logic, and that cannot be undone. The engine now stays in the private server repository, and the browser asks the API instead. Access control is unaffected either way: it protects actions and data, not source code. The cost is a network round trip per check. The engine itself takes about 3 ms for a folding-carton spec, so editors still get feedback while they type. The browser copy can be added later without undoing anything, if Justin agrees to publish it.

### D3: Ownership moves one collection at a time

A collection (product types, capabilities and values, fields, templates, rules, regional materials, equivalencies, …) becomes **owned by the Spec System** when its admin editor has shipped and Justin has signed it off. From then on, that collection is no longer taken from his exports, and the importer refuses changes to it with a reason. Collections not yet moved keep arriving by export through the PLAT-81 path (held changes for approved records). When every collection has moved, the Spec Library becomes read-only.

### D4: Admin edits approve themselves; everything else is a proposal

- **An admin's edit** (Registry role admin) counts as approved when it is saved.
- **Everything else is a proposal** that waits for an admin to approve, reject or defer it, using the existing changeset path:
  - edits by other roles (for example approvers);
  - records created from a map (D8);
  - vendor submissions (PLAT-19).

Every save and every decision goes into history, in the same transaction as the change, so a change can't be saved without its history.

### D5: Revisions per record, and protection against overwrites

- Each record carries a **revision number** that goes up with every saved change.
- A save names the revision it started from. If someone else has saved since, the save is refused, and the editor shows the newer version.
- Maps and job spec revisions pin **record + revision**, so a released job spec can always be reproduced.
- A library version now only names an import batch.

### D6: Retire, never delete

- A retired record leaves lists, pickers and the approved-only view, but stays in the tables and the history. Anything that still points to it shows it as retired.
- The lifecycle status is the Spec System's own column. It doesn't reuse the export's `source_status`.
- Removing a record from a product type is different from retiring it:
  - for templates and fields, it removes the link;
  - for a capability shared by a line, it adds an override on that product type's template. Removing the capability from the whole line is a separate action that first says how many product types it affects.

### D7: Library review is grouped by product type and decided per record

- **Grouping.** The review lists product types. Under each, it shows what is **new**, **changed** or **removed** since the last approved state, and hides records that haven't changed. Each record is still approved, rejected or deferred on its own. A record shared by several product types shows "used by N product types" and is decided once, wherever it appears.
- **First review.** A one-time **"Set as baseline"** per product type records today's content as the starting point after a check. Otherwise the first review would show all 458 folding carton records as new.
- **Editing.** *Edit* opens the product type with its related records, for the collections the Spec System owns (D3).
- **Advanced view.** Record-by-record review stays available behind "Advanced".

### D8: Maps are edited in Mapping review

- **Pickers.** Each map has two pickers. *Production product* searches existing product types. *Preset values* searches existing capabilities and fields, and presets can be added or removed. Changing a map with existing records is an edit (D4): approved when an admin saves it.
- **"+ Add new…"** ends each picker. It creates the record as a **proposal**: the map points to it at once, but the record waits in library review as new until an admin there approves it. The library never changes unseen through a map.
- **Presets stored as text.** A preset stored only as text shows an empty picker, which resolves the "needs a production code" cases.

### D9: Order of work

1. **Quick wins** (meeting notes 2, 5, 6): the preview image on map rows, structured navigation, a clearer approval view.
2. **Foundations:**
   - the spec engine with his tests, in the Registry API (PLAT-87);
   - the Registry migration and API for revisions, history, proposals, retiring and collection ownership (PLAT-84).
3. **Library review and mapping editing** (PLAT-85, PLAT-86). Ownership of product types and capabilities with their values moves (notes 3, 4).
4. **The rest of the editors, one collection at a time** with Justin's sign-off (fields, templates, rules, regional materials, equivalencies), then the spec preview and the validation suite on the engine.
5. **Mapping solutions and inspirational items** (note 1).

Folding cartons only until Justin has approved them (meeting decision Q7).

## Consequences

- **Positive:**
  - One place to change each collection at any time, with no merging.
  - Justin's operating knowledge is kept as running, tested code rather than retyped.
  - Every write, including vendor and scripted writes, is checked by the same engine.
  - History is complete and can't be silently lost.
  - Released job specs are reproducible.
  - Vendor onboarding gets a review path from day one.
- **Negative:**
  - The screens are rebuilt, not reused. That takes longer than hosting his tool, and each screen needs Justin's sign-off.
  - Until all collections have moved, two sources exist side by side: owned collections are edited in the Spec System, the others arrive by export. Each collection has exactly one owner at a time, though.
  - Every preview and check in the admin is a call to the API, so it needs the network and a signed-in registry user (D2, amended 2026-11-19).
- **Changes to open tickets:**
  - PLAT-81: imports continue for collections not yet owned, and stop per collection.
  - PLAT-51: decisions stay per record, now grouped by product type with a baseline.
  - PLAT-52: gains editing.
  - Meeting Q5: codes are added in Mapping review (as proposals).
  - Meeting Q6: exports continue only for collections not yet moved.
- **Neutral:** the release gate is unchanged. Approval is still required before a job spec revision goes to a vendor, and internal views still work on unapproved data.

## Alternatives considered

- **Host Justin's screens and point them at the Registry API.** Fastest to every editor, and his code says its storage can be swapped. Rejected:
  - It would ship the single-user design to a shared, audited tool: the last save wins, history can be lost, checks run only in the browser, and delete is a hard delete.
  - It would add a second interface on a different stack (Preact from a CDN, no tests).
  - It would drift whenever Justin changes his own copy.
- **Rewrite the logic from scratch.** Rejected: it would risk losing operating knowledge that his code and test cases already capture.
- **Switch every collection to the Spec System at once** (revision 1 of this ADR). Rejected: rules, templates and materials would have had no editor anywhere until the last phase.
- **Saving approves for every editor, and records created from maps are approved** (revision 1). Rejected: it removes the check that vendor onboarding and the release gate rely on.
- **Approve per product type** (revision 1). Rejected: most records are shared by a whole line, so approving one product type would approve records for the others unseen.
- **Share the engine with the browser** (revision 2: a copy in this repository kept identical by a CI check, or a private npm package). Rejected on 2026-11-19: this repository is public, so a copy here publishes Justin's logic for good. A private package would need registry tokens in Vercel and in both CIs, plus a release step for every change.
- **Edit in both places and sync both ways.** Rejected: costly, and the copies drift.
- **Hard delete.** Rejected: maps and job specs point to records, and the history must stay whole.

## Open items

None.

Resolved 2026-11-18: Justin confirmed his Spec Library code may be reused (D2).
Resolved 2026-11-19: the engine lives in the Registry API only, and the admin calls it (D2 amendment, PLAT-87).

## References

- Meeting: Production & Dev Meeting 2026-11-18, Spec Review Pages Demo (Justin): Confluence 437813249, sections 5–7.
- Design: PFP-109 / PLAT-30 PakFactory Spec proposal, Confluence 427589664.
- Justin's Spec Library (claude.ai artifact, shared by Justin), read 2026-11-18.
- Confluence copy: https://dotdirect.atlassian.net/wiki/spaces/Pakfactory/pages/437682180
- Admin: https://staging.admin.pakfactory.com/spec/library and /spec/mapping.
