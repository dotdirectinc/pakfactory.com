# ADR-028: The production spec is authored in the Spec System: one master copy, auditor edits that approve themselves, and review by product type

**Status:** proposed. Decided by Richard Qin on 2026-11-18, after the [production and dev meeting with Justin Chow](https://dotdirect.atlassian.net/wiki/spaces/Pakfactory/pages/437813249) the same day. Accept after Justin Chow (production spec owner) and Alex Pan have reviewed it.
**Date:** 2026-11-18
**Owner:** Richard Qin
**Jira:** under [PLAT-30](https://dotdirect.atlassian.net/browse/PLAT-30) (PakFactory Spec DB). It changes [PLAT-51](https://dotdirect.atlassian.net/browse/PLAT-51) (library review), [PLAT-52](https://dotdirect.atlassian.net/browse/PLAT-52) (mapping review) and [PLAT-81](https://dotdirect.atlassian.net/browse/PLAT-81) (spec_workflow imports). Built in [PLAT-84](https://dotdirect.atlassian.net/browse/PLAT-84) (Registry API), [PLAT-85](https://dotdirect.atlassian.net/browse/PLAT-85) (library review by product type) and [PLAT-86](https://dotdirect.atlassian.net/browse/PLAT-86) (mapping editing). Related: [PLAT-19](https://dotdirect.atlassian.net/browse/PLAT-19) (vendor product onboarding).
**Applies to:** `admin` · Spec registry (`pakfactory.com-server`; Registry DB schemas `spec_production`, `spec_workflow`, `spec_mapping`)

**Numbering note:** first drafted on 2026-11-18 as platform ADR-0021 (vault and Confluence). It was moved here the same day because it is a Spec System decision, like [ADR-025](0025-spec-system-owns-catalog-relations.md) and [ADR-026](0026-spec-system-owns-catalog-structure.md). Platform ADR-0021 is withdrawn, and that number is free again.

**Conforms to:**
- [ADR-025](0025-spec-system-owns-catalog-relations.md) and [ADR-026](0026-spec-system-owns-catalog-structure.md): the Spec System already owns catalog relations and structure. This ADR extends that ownership to the production side.
- Platform ADR-0008 Product Spec Management System: the Registry holds the spec model.
- Platform [ADR-0017](https://dotdirect.atlassian.net/wiki/spaces/Pakfactory/pages/427753527) and PLAT-42: a new record gets a generated ID and code.
- Platform [ADR-0020](https://dotdirect.atlassian.net/wiki/spaces/Pakfactory/pages/428376065) D6: the production side of the spec lives in the Registry first, then moves to Aurora (PLAT-5).
- The PFP-109 / PLAT-30 proposal (Confluence 427589664): approval is the gate for releasing a job spec revision to a vendor (section 6b).

## Context

- **How it works today:**
  - The production spec is Justin's Spec Library, a browser tool he edits himself. Its JSON export (2026-11-12, library version 1) was imported into the Registry (PLAT-50).
  - PLAT-81 makes later exports flow in: records nobody has approved take the new values, and approved records that changed wait as held changes.
  - The Spec System's two review pages are read-only: they decide on what was loaded. *Production library* takes a decision on every record (458 for folding cartons). *Mapping* takes a decision on each map from Terence's draft.
- **What Justin asked for at the 2026-11-18 meeting:**
  1. include solutions and inspirational items;
  2. show a preview image;
  3. allow creating and remapping;
  4. edit capabilities and their values (text, numbers);
  5. give the All records left-hand navigation more structure;
  6. make the approval view more intuitive.

  He also asked whether the Spec System can do everything his Spec Library does.
- **What his Spec Library does** (read from its code on 2026-11-18):
  - 11 collections: categories, product types, capability groups, capabilities, sections, fields, templates, rules, examples, regions, equivalencies;
  - template inheritance (global → line → type);
  - a rule engine (pair rules, "requires" rules, checks on material layers);
  - regional material profiles;
  - a specification preview with live validation;
  - a validation suite;
  - JSON / CSV import and export, and a changelog for each record.

  Whoever can write saves directly. There is no second approval.
- **The intended use is wider than one review.** Richard, 2026-11-18: the library review will probably become the vendor onboarding review tool (PLAT-19). An auditor needs to see what is new (products, capabilities) per product type, not decide on every record. The auditor must also be able to fix what they see.
- **The problem with two places to edit.** If people edit both in the Spec Library and in the Spec System, the two copies drift. Every export would then need merging by hand.

## Decision

### D1: The Spec System is the master copy of the production spec

Justin's Spec Library is imported one last time. After that, the production spec is edited only in the Spec System, and the Spec Library becomes read-only (or is retired). The import path in PLAT-81 is switched off after that final load. An attempt to import refuses with a reason.

### D2: An auditor's save is the approval

A user with the Registry approver or admin role can create or change records and maps. Each save:
- writes a new row to the record's history, with the editor, the time, and the before and after values;
- counts as approved, because the auditor is the reviewer.

There is no second approver. A save can be undone by saving the earlier values, and the history shows both. Users without the role can see but not edit.

### D3: Deleting a record retires it

A retired record leaves lists, pickers and the approved-only view. It stays in the tables and the history, and anything that still points to it (a map, a job spec) shows it as retired. Nothing is removed from the database. Separately, *removing* a record from a product type only cuts the link; the record stays in the library.

### D4: The library is reviewed by product type, as a list of changes

For each product type, the review shows what is **new**, **changed** or **removed** since the last approved state, grouped by kind (product type, template, capability, field, rule). Unchanged records are hidden. A new product line or vendor shows everything as new. The whole product type is approved, rejected or deferred in one action. **Edit** opens the product type with all its related records, and the auditor can add, change, unlink or retire any of them (D2, D3). Record-by-record review stays available behind an "Advanced" link.

### D5: Maps are edited in Mapping review

Each map has two pickers. *Production product* searches the existing product types. *Preset values* searches the existing capabilities (and fields); presets can be added or removed. Each picker ends with **+ Add new…**, which creates the record from inside the map, selects it, and lists it as *new* under its product type in the library review (D4). The library can't change quietly through a map. Saving a map approves it (D2). A preset stored only as text gets an empty picker, which resolves the "needs a production code" cases.

### D6: Justin's Spec Library features come in phases, starting with editing

Order:
1. Quick review fixes: preview image, structured navigation, the approval view. These are meeting notes 2, 5 and 6.
2. Editing and remapping (D1–D5): notes 3 and 4.
3. Mapping solutions and inspirational items: note 1.
4. The specification preview and validation suite, by moving his rule engine (pure functions, no screen or storage code) into a shared package. The same engine later builds job specs.
5. Regional material profiles and equivalencies, editors for rules and templates, export and restore.

Only folding cartons are in scope until Justin has approved them (meeting decision Q7).

## Consequences

- **Positive:**
  - one place to change the production spec, and no merges;
  - the review page also works for onboarding vendors;
  - the auditor can fix a wrong map or a missing record at once, instead of rejecting it and waiting for an export;
  - the 44 presets that need a production code can be resolved inside Mapping review.
- **Negative:**
  - The Spec System has to build editors that the Spec Library already has. That is phases 2–5, and they are large (new Registry API endpoints and admin screens).
  - Until phase 4, the Spec System can't preview or validate a full spec the way the Spec Library can.
  - Self-approval puts the quality check on the auditor's own judgment. The history is the safeguard.
- **Changes to open tickets:**
  - PLAT-81: imports of further exports end after the final load.
  - PLAT-51: its acceptance criteria approve one record at a time; that becomes approval per product type.
  - PLAT-52: gains editing.
  - Meeting Q5 ("Justin adds the codes in his next export") and Q6 ("next export") are replaced: codes are added in Mapping review, and there are no further exports.
- **Neutral:** rules for when a job spec can be released are unchanged. Approval is still the gate for releasing a job spec revision to a vendor, and internal views still work on unapproved data.

## Alternatives considered

- **Keep the Spec Library as the master and keep importing exports (the PLAT-81 model).** Rejected: auditors couldn't fix anything in the Spec System, and onboarding vendors would depend on one person's browser tool.
- **Edit in both places and sync both ways.** Rejected: costly, and the copies drift whenever two people change the same record.
- **A second approver for every edit.** Rejected for now: the auditor already is the reviewer, and a second approver would make every fix a two-person job. The history keeps every change reversible. This can be revisited for vendor-submitted changes (PLAT-19).
- **Hard delete.** Rejected: maps and job specs point to records, and the history must stay whole.
- **Keep the record-by-record review.** Rejected as the default: 458 decisions for one line doesn't scale to vendor onboarding. It stays available behind "Advanced".

## References

- Meeting: Production & Dev Meeting 2026-11-18, Spec Review Pages Demo (Justin): Confluence 437813249, sections 5–7.
- Design: PFP-109 / PLAT-30 PakFactory Spec proposal, Confluence 427589664.
- Justin's Spec Library (claude.ai artifact, shared by Justin), read 2026-11-18.
- Confluence copy: https://dotdirect.atlassian.net/wiki/spaces/Pakfactory/pages/437682180
- Admin: https://staging.admin.pakfactory.com/spec/library and /spec/mapping.
