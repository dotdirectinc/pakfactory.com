# Bug: Inspiration presets stored a copy of their base's option list

**Status:** Fixed — #747 into `www-new-release` + pakfactory.com-server #273 into `dev`
(2026-10-02); migration `20261002-preset-unset-inherited-customizations` applied on development
**Jira:** PROD-2778 · **Vault record:** BUG-0045
**Symptom:** The preset picker summary read *"54 inherited · 0 pre-selected"*, yet rows showed
★ PRE-SELECTED and headers counted e.g. *Closures & Seals 1 / 5*.

## What happened

On development, **640 of 750** Inspiration presets stored `availableCustomizations` entries
without `preselected: true` — 638 exact copies of the base product's list, 2 partial, 10–57
entries each. Only 17 presets held any real pre-selection.

| Reader | Treated an entry without the flag as |
|---|---|
| Studio picker | pre-selected (★, header counts) |
| Picker summary | not pre-selected |
| www (`preselectedIds`) | ignored |

The copies came from the catalog fill (`pakfactory.com-server/scripts/sanity-fill.mjs`), which
wrote each preset's field as its Notion picks **plus a copy of the base's list**. D61 had rejected
exactly that shape ("the same fact in two documents").

**The latent part:** the fill owns every non-empty field, and the uploader
(`apps/studio/scripts/fill-catalog-from-review.mjs`) `set`s owned fields wholesale. A copied list
is never empty, so a fill re-run would have **replaced editors' hand-made pre-selections**.

## Fix

- Migration `migrate:preset-unset-inherited-customizations`: removes every preset entry that is
  not `preselected: true` and keeps the rest. Dry run by default, `--verify`. Development: 19,276
  entries removed from 643 presets (drafts included); `--verify` passes on 754. Production:
  nothing to do.
- Picker: on a preset only `preselected: true` counts and stars. Pre-selecting an option that has
  a leftover entry sets the flag on it instead of duplicating it.
- Fill (server #273): no longer writes a preset's `availableCustomizations` at all. Pre-selections
  are entered by hand in Studio (Crystal, 2026-10-02 — Notion holds none to import).

## Root cause & prevention (the reusable lesson)

**A fill owns whatever it fills, so its re-run is a write over editors' work.** "An empty cell
never blanks a Sanity value" makes ownership depend on content: filling a field with a rejected
copy meant owning it.

- When a design decision rejects a data shape, grep the **writers** (fills, seeds, importers)
  for it, not only the readers.
- For every fill-owned field, ask what a re-run does to edits made in Studio since.
- Studio should interpret a flag the way www does. Two readers, two semantics, and the data looks
  fine in each place.
