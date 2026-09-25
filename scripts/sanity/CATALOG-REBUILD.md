# Catalog rebuild — purge `development` and refill from Notion + the board

Project `8293wrxp` · dataset `development` · **PROD-2514 / PROD-2557 / PROD-2558**

> **Backup and restore live next door** — [`RUNBOOK.md`](./RUNBOOK.md). The one-shot migration
> register is [`MIGRATIONS.md`](./MIGRATIONS.md). This file covers the third thing: deleting the
> catalog and rebuilding it from source, which is a **repeatable dataset op**, not a migration,
> and is registered under `TASKS` rather than `MIGRATIONS`.

## The policy this exists to serve

**Notion and the Miro board are the only sources of truth. Nothing already in a Sanity dataset
is to be treated as up to date.** (Richard, 2026-09-23.)

So the catalog is *deleted and rebuilt* rather than patched in place — every document that
survives then has a known provenance. Patching would leave documents of unknown age carrying
fields no source owns.

**Scope is products and customizations only.** Blog, case studies, www pages, redirects,
navigation, settings and the migration ledger are not touched.

| In scope (deleted) | Out of scope (untouched) |
|---|---|
| `product` · `productLine` · `productStyle` · `solution` | `post` · `caseStudy` · `author` · `client` · `faq` |
| `customizationOption` · `customizationType` | `homePage` · `legalPage` · `settings` · `websiteNavigation` |
| `property` · `propertyValue` | `redirect` · `redirectGroup` · `migrationRun` |

## Two things that will bite

### `customizationCategory` must survive

The four category documents are **excluded on purpose**. The catalog fill never creates
categories — `pakfactory.com-backend/scripts/sanity-fill.mjs` hard-exits with *"customizationCategory
… is not in sanity.json — the fill never creates categories."* Deleting them does not clear the
way for a rebuild, it makes the rebuild impossible. `--with-categories` overrides it for anyone
who means it.

`property` and `propertyValue` are safe to delete — the fill recreates them (`ensureProperty` /
`ensureValue`).

### Sanity will not delete a strongly-referenced document

There is **no force-delete**. A transaction covers references *between* documents inside it,
which is why intra-catalog references are fine, but references from outside block the delete
outright. In `development` there are **203 such references across 59 catalog documents**:

| From | References |
|---|---|
| `caseStudy` | 150 |
| `client` | 36 |
| `solutionStyle` | 12 |
| `faq` | 5 |

That content is *not* regenerated from Notion, so the rebuild cannot repair those references by
itself, and the old ids stop existing the moment the documents do. Hence the repair map below,
and `--detach-referrers`, which unsets exactly those reference paths first.

## The repair map

`--emit-map <path>` writes `id → type + title` plus every external referrer **before** anything
is deleted. `--confirm` is **refused without it** whenever anything outside the catalog points
in — the map is the only record of what pointed where, and it stops existing with the documents.

It records *how* each one is repaired, because title is not always the key:

| Repair | Count | Refs | Meaning |
|---|---|---|---|
| `title` | 53 | 186 | the rebuild recreates the same title |
| `alias` | 3 | 8 | renamed in Notion; the successor is named in the map |
| `choice` | 3 | 9 | a model change — a person picks |

**Aliases** (verified against the 2026-09-23 Notion pull; every successor is Status `Copies Done`
or `New`, none `Remove`):

```
Aqueous Coating        → AQ Coating (Aqueous)
Soft Touch Lamination  → Soft Touch/Velvet Lamination
Internal PE Coating    → Internal PE Lining        (also moves to Food-Safe Treatment)
```

**Choices** are *not* renames. Sanity merged embossing and debossing into one option per
registration type; Notion keeps them apart:

```
Registered Embossing & Debossing  → Registered Embossing  | Registered Debossing   (6 refs)
Blind Embossing & Debossing       → Blind Embossing       | Blind Debossing        (2 refs)
Combination Embossing & Debossing → Combination Embossing | Combination Debossing  (1 ref)
```

A case study citing the merged option has to become one or the other, and only its own copy can
say which — so these are emitted as a choice and **never auto-resolved**. They span nine case
studies: `venture`, `via-carota`, `east-west-bank`, `hello-adorn`, `maui-chocolate`,
`drop-supplements`, `sonhab-chocolate`, `woah-dough` (draft), `torch-sushi`.

## Sequence

Short commands, one per line. **Steps 3 and 6 are mandatory and easy to skip**: step 4 silently
plans against stale ids without 3, and step 8 refuses outright without 6.

```bash
# 0 · working dirs
mkdir -p ~/cf/build ~/cf/rel
cp ~/catalog-fill/<date>/notion.json ~/cf/build/
```

```bash
# 1 · back up first — not reversible from inside Sanity
npx sanity@latest dataset export development ~/cf/dev-before.tar.gz -p 8293wrxp
```

```bash
# 2 · purge — dry run, read the referrer list, then delete
cd <repo>
pnpm --filter @pakfactory/studio run purge:catalog -- --dataset development --emit-map ~/cf/purge-map.json
pnpm --filter @pakfactory/studio run purge:catalog -- --dataset development --emit-map ~/cf/purge-map.json --confirm --accept-dangling --detach-referrers
```

```bash
# 3 · re-pull the dataset — MANDATORY, the old review set is now wrong
cd <backend>
node --env-file=<repo>/.env.local scripts/sanity-fill.mjs pull-sanity --dataset development --out ~/cf/build
```

```bash
# 4 · generate the catalog set — expect ~1,900 creates, 0 patches, 0 held back
node scripts/sanity-fill.mjs generate --in ~/cf/build --out ~/cf/build/review
```

```bash
# 5 · upload the catalog — dry run first, always
cd <repo>
pnpm --filter @pakfactory/studio run fill:catalog -- --review ~/cf/build/review --dataset development
pnpm --filter @pakfactory/studio run fill:catalog -- --review ~/cf/build/review --dataset development --confirm
```

```bash
# 6 · re-pull again — MANDATORY, the relationship fill needs post-upload ids
cd <backend>
node --env-file=<repo>/.env.local scripts/sanity-fill.mjs pull-sanity --dataset development --out ~/cf/rel
```

```bash
# 7 · registry snapshot (read-only)
npm run fill:relationships -- snapshot --project vregjwafwbglmwhzorpw --out ~/cf/rel/snap.json
```

```bash
# 8 · relationships + dependsOn — 10 types, 8 category entries, 8 type entries
npm run fill:relationships -- generate --registry ~/cf/rel/snap.json --documents ~/cf/build/review --sanity ~/cf/rel/sanity.json --out ~/cf/rel/review
```

```bash
# 9 · upload relationships
cd <repo>
pnpm --filter @pakfactory/studio run fill:catalog -- --review ~/cf/rel/review --dataset development
pnpm --filter @pakfactory/studio run fill:catalog -- --review ~/cf/rel/review --dataset development --confirm
```

**10 · re-point the 203 references** from `~/cf/purge-map.json` — 194 mechanical, 9 by hand.

`--documents` in step 8 points at the **build** review set, not the rel one. It is checked
against that set's own manifest, so a mismatch fails loudly rather than quietly.

If step 7 warns the matrix is stale, run `select app.refresh_product_spec_matrix();` against the
registry (a production write, so a person runs it) and retake the snapshot.

## Solution Styles (PROD-2605)

The 2026-09-14 scope skipped Notion's Solution Style table (A3). It is filled on its own, **after** the
catalog, with `generate --types solutionStyle` so nothing else is re-patched. First launch → published,
every other row → draft (even with no filter — listed in the report as needing one). Slug from Title,
meta title blank, images not written.

```bash
# a · remove the seeded test styles first — dry run, then confirm
cd <repo>
pnpm --filter @pakfactory/studio run remove:seeded-solution-styles -- --dataset development
pnpm --filter @pakfactory/studio run remove:seeded-solution-styles -- --dataset development --confirm
```

```bash
# b · pull Notion + a fresh snapshot, generate Solution Styles only
cd <backend>
node --env-file=.env.local scripts/sanity-fill.mjs pull-notion --out ~/cf/ss
node --env-file=../pakFactory/pakfactory.com/.env.local scripts/sanity-fill.mjs pull-sanity --dataset development --out ~/cf/ss
node scripts/sanity-fill.mjs generate --in ~/cf/ss --out ~/cf/ss/review --types solutionStyle
```

Read `~/cf/ss/review/report.md` — expect 198 creates (103 publish, 95 draft), the "Solution Styles"
section, and no seeded styles under "In Sanity, not in Notion".

```bash
# c · upload — dry run first
cd <repo>
pnpm --filter @pakfactory/studio run fill:catalog -- --review ~/cf/ss/review --dataset development
pnpm --filter @pakfactory/studio run fill:catalog -- --review ~/cf/ss/review --dataset development --confirm
```

## Preconditions

- **Nightly prod → dev sync must be paused.** Repo variable `SANITY_DEV_SYNC_PAUSED=true`
  (paused since 2026-09-14). Otherwise `import --replace` reverts every rebuilt document
  overnight.
- Notion read token in `pakfactory.com-backend/.env.local`; Sanity read token in the repo's
  `.env.local`.
- Drive images are **optional** — `drive.json` missing means no images are planned and the fill
  records a caveat (`sanity-fill.mjs`). Images do not block the rebuild.

## Status (2026-09-25)

**`development` is rebuilt and live in www. `production` is untouched and paused.**

| Step | State |
|---|---|
| 1–10 on `development` (PROD-2596) | ✅ Done 2026-09-24. 1,972 catalog documents; 182 of 203 references re-pointed. 9 embossing choices and 12 with no successor are left for Eric. |
| `dependsOn` as requirements | ✅ PROD-2595 / PROD-2597 (#634, backend #215). One requirement per board frame. |
| www reads the shared rules | ✅ PROD-2556: #635 rules, #638 `customerSelects` picks, #641 pairwise incompatibilities, #643 disabled-not-hidden |
| `production` rebuild | ⏸ **Paused, not yet ticketed** (PROD-2596 is the dev run; its criteria say production is planned separately). www shows each product's own list there until it has `compatibleCustomizations` + `dependsOn` data (the `prepareRules` guard). |

**Solution Styles were never filled** — the 2026-09-14 scope skipped them (A3) before the type existed. Tracked in PROD-2605.

Things that are **by design**, not gaps:

- **Coming-soon options are drafts.** `sanity-fill.mjs` publishes only First Launch customizations. Multi-Level Debossing / Embossing, Plastisol Ink, Translucent Ink and Specialty Wrap sit in `development` as unpublished drafts with their pairs already filled; publishing one makes it appear in the builder.
- **Incompatibilities live in `compatibleCustomizations`.** The relationship fill asks the registry engine — Crystal's 20 `exclude` rules included — so an unticked pair between two options one product offers is a real clash. There is no `excludes` field (ADR-022 decision 5, amended 2026-09-25).
- **`nothing-else-alongside-textured-embossing`** reads `value_or_tag: "embossing_debossing"`, but its `subject_type` is `attribute`, so the engine ignores the value and fires on any Embossing pick. It works.
