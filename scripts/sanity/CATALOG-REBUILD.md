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

## Preconditions

- **Nightly prod → dev sync must be paused.** Repo variable `SANITY_DEV_SYNC_PAUSED=true`
  (paused since 2026-09-14). Otherwise `import --replace` reverts every rebuilt document
  overnight.
- Notion read token in `pakfactory.com-backend/.env.local`; Sanity read token in the repo's
  `.env.local`.
- Drive images are **optional** — `drive.json` missing means no images are planned and the fill
  records a caveat (`sanity-fill.mjs`). Images do not block the rebuild.

## Status (2026-09-24)

- `purge:catalog` landed in **PR #619** (dry-run, `--emit-map`, category exclusion, referrer report).
- `--detach-referrers` is **in progress** on `fix/PROD-2514-purge-detach-referrers` — the first
  `--confirm` run failed on chunk 1 against the strong-reference rule and rolled back atomically,
  deleting nothing.
- No purge has been executed. `development` still holds all 776 catalog documents.
