# ADR-028: The production spec moves into the Spec System one collection at a time, on Justin's engine and design

**Status:** proposed. Decided by Richard Qin on 2026-11-18, after the [production and dev meeting with Justin Chow](https://dotdirect.atlassian.net/wiki/spaces/Pakfactory/pages/437813249) the same day. Revised the same day after a design challenge (revision 2). Accept after Justin Chow (production spec owner) and Alex Pan have reviewed it.
**Date:** 2026-11-18
**Owner:** Richard Qin
**Jira:** under [PLAT-30](https://dotdirect.atlassian.net/browse/PLAT-30) (PakFactory Spec DB). Built in [PLAT-84](https://dotdirect.atlassian.net/browse/PLAT-84) (Registry API), [PLAT-85](https://dotdirect.atlassian.net/browse/PLAT-85) (library review), [PLAT-86](https://dotdirect.atlassian.net/browse/PLAT-86) (mapping editing) and [PLAT-87](https://dotdirect.atlassian.net/browse/PLAT-87) (shared spec engine). It changes [PLAT-51](https://dotdirect.atlassian.net/browse/PLAT-51), [PLAT-52](https://dotdirect.atlassian.net/browse/PLAT-52) and [PLAT-81](https://dotdirect.atlassian.net/browse/PLAT-81). Related: [PLAT-19](https://dotdirect.atlassian.net/browse/PLAT-19) (vendor product onboarding), [PLAT-83](https://dotdirect.atlassian.net/browse/PLAT-83) (job specs).
**Applies to:** `admin` · a new shared package (`spec-engine`) · Spec registry (`pakfactory.com-server`; Registry DB schemas `spec_production`, `spec_workflow`, `spec_mapping`)

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

### D2: Reuse his logic as a shared, tested engine

His logic moves into a typed shared package, `spec-engine`, with as few changes as possible. His validation-suite test cases become the package's automated tests, so it keeps doing what he expects. The same engine runs:
- on the server (Registry API), to check every write, whoever or whatever makes it;
- in the browser, for previews and instant feedback.

Later it also builds job specs (PLAT-83). Nothing else reimplements this logic. Before any code is copied, we need confirmation that Justin's code (shared from outside our organization) may be reused.

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
   - the `spec-engine` package with his tests (PLAT-87);
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
  - The engine package must be shared between the admin (pakfactory.com) and the Registry API (pakfactory.com-server), which are separate repositories (see PLAT-87).
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
- **Edit in both places and sync both ways.** Rejected: costly, and the copies drift.
- **Hard delete.** Rejected: maps and job specs point to records, and the history must stay whole.

## Open items

- Confirm that Justin's Spec Library code may be reused (D2). Owner: Richard, with Justin.
- Where the `spec-engine` package lives so that both admin and the Registry API can use it (PLAT-87).

## References

- Meeting: Production & Dev Meeting 2026-11-18, Spec Review Pages Demo (Justin): Confluence 437813249, sections 5–7.
- Design: PFP-109 / PLAT-30 PakFactory Spec proposal, Confluence 427589664.
- Justin's Spec Library (claude.ai artifact, shared by Justin), read 2026-11-18.
- Confluence copy: https://dotdirect.atlassian.net/wiki/spaces/Pakfactory/pages/437682180
- Admin: https://staging.admin.pakfactory.com/spec/library and /spec/mapping.
