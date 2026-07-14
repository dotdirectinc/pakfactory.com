# Agent Brief — PROD-1957: Blog search Algolia integration

> **Ticket:** [PROD-1957](https://dotdirect.atlassian.net/browse/PROD-1957) — S2.7.1 Blog search: Algolia integration (sync Function + backend swap)
> **Strategy doc:** `docs/plans/2026-07-08-algolia-blog-search-integration.md` (read it; this brief is the execution version)
> **This file is self-sufficient — follow it top to bottom.**

## Before you write any code

1. Read `AGENTS.md`, `docs/adr/README.md` (esp. ADR-005), `apps/blog/CLAUDE.md`.
2. Check commit mode: `./.claude/commit-mode.sh` (currently `mix-commiter` — multi-app commits allowed; re-verify).
3. Branch off `staging`, open a **draft PR**, never merge yourself.
4. **pnpm only.** Never npm/yarn. Never install the legacy `sanity-algolia` package.
5. **Never create/patch/publish documents in any Sanity dataset** — schemas/queries in git only. The backfill script writes to *Algolia*, which is allowed, but a **human runs it**.
6. Fail fast if env vars are missing (see below) — scaffold everything, but mark the ticket blocked on the human prerequisites rather than inventing credentials.

## Environment variables (human provides real values)

```bash
# Frontend (safe to expose) — root .env.local + Vercel blog project
NEXT_PUBLIC_ALGOLIA_APP_ID=
NEXT_PUBLIC_ALGOLIA_API_KEY=      # SEARCH key only

# Server-only — Function env + backfill script (NEVER NEXT_PUBLIC_)
ALGOLIA_APP_ID=
ALGOLIA_WRITE_KEY=
```

Add these (empty, with comments) to the root `.env.example`. Never reference `ALGOLIA_WRITE_KEY` anywhere under `apps/blog/`.

## Verified repo facts (checked 2026-07-08 — trust these, re-verify if stale)

- Post schema: `apps/studio/schemas/post.ts` — fields include `title`, `slug`, `excerpt`, `tldr`, `body`, `mainImage` (with `alt`), `category` (ref), `tags` (refs), `author` (ref), `publishedAt`, `lastModified`, `faqItems`.
- SEO fields from `apps/studio/lib/seo-fields.ts` are spread **flat at the document root** (grouped under the `seo` *tab*, but not nested in an `seo` object). The indexing opt-out is the boolean **`allowIndex`** at the document root (`initialValue: true`). Projection path is `allowIndex`, **not** `seo.allowIndex` — confirm once against a real document.
- Search page (PROD-1503, shipped): `apps/blog/src/app/search/page.tsx` + `apps/blog/src/lib/blog-search.ts`. Contract: `?q={query}&page={n}` + filters/sort; robots always `noindex, follow`; zero-results shows a "Popular this month" rail. **Keep all of this identical.**
- GROQ lives in `packages/sanity/src/queries/`; blog data access in `apps/blog/src/lib/`.
- Studio scripts precedent: `apps/studio/scripts/*.mjs`.

## Step 1 — Dependencies

```bash
pnpm add -w @sanity/blueprints dotenv                 # repo root (blueprint config)
# function dir gets its own package.json (see Step 3)
pnpm --filter @pakfactory/studio add -D algoliasearch # backfill script
pnpm --filter @pakfactory/blog add algoliasearch      # liteClient for the search backend
```

(If `-w` root-dep conflicts with workspace policy, put blueprint deps in a root `devDependencies` — flag it in the PR description.)

## Step 2 — Blueprint (`sanity.blueprint.ts`, repo root — NEW)

```ts
import {defineBlueprint, defineDocumentFunction} from '@sanity/blueprints'
import 'dotenv/config'
import process from 'node:process'

const {ALGOLIA_APP_ID, ALGOLIA_WRITE_KEY, SANITY_PROJECT_ID, SANITY_DATASET} = process.env
if (!ALGOLIA_APP_ID || !ALGOLIA_WRITE_KEY) throw new Error('ALGOLIA_APP_ID and ALGOLIA_WRITE_KEY must be set')
if (!SANITY_PROJECT_ID || !SANITY_DATASET) throw new Error('SANITY_PROJECT_ID and SANITY_DATASET must be set')

export default defineBlueprint({
  resources: [
    defineDocumentFunction({
      type: 'sanity.function.document',
      name: 'algolia-document-sync',
      memory: 1,
      timeout: 10,
      src: './functions/algolia-document-sync',
      event: {
        on: ['create', 'update', 'delete'],
        filter: "_type == 'post' && defined(slug.current)",
        projection: `{
          _id, _type, _rev,
          title,
          "slug": slug.current,
          excerpt, tldr,
          "content": pt::text(body),
          "category": category->{title, "slug": slug.current},
          "tags": tags[]->{title, "slug": slug.current},
          "author": author->{name, "slug": slug.current},
          publishedAt, lastModified, _createdAt, _updatedAt,
          "image": {"assetRef": mainImage.asset._ref, "alt": mainImage.alt},
          allowIndex,
          "operation": delta::operation()
        }`,
      },
      env: {ALGOLIA_APP_ID, ALGOLIA_WRITE_KEY, SANITY_PROJECT_ID, SANITY_DATASET},
    }),
  ],
})
```

## Step 3 — Sync Function (`functions/algolia-document-sync/index.ts` — NEW)

Own `package.json` in the function dir with: `@sanity/functions`, `algoliasearch` (v5), `@sanity/asset-utils`.

```ts
import {env} from 'node:process'
import {documentEventHandler} from '@sanity/functions'
import {algoliasearch} from 'algoliasearch'
import {buildImageUrl, parseImageAssetId, isImageAssetId} from '@sanity/asset-utils'

const {ALGOLIA_APP_ID = '', ALGOLIA_WRITE_KEY = '', SANITY_PROJECT_ID = '', SANITY_DATASET = ''} = env
const INDEX = 'posts'
const MAX_CONTENT = 8000

const imageUrl = (ref?: string | null) => {
  if (!ref || !isImageAssetId(ref)) return null
  return buildImageUrl({...parseImageAssetId(ref), projectId: SANITY_PROJECT_ID, dataset: SANITY_DATASET})
}

export const handler = documentEventHandler(async ({event}) => {
  const d = event.data
  const algolia = algoliasearch(ALGOLIA_APP_ID, ALGOLIA_WRITE_KEY)

  // Deletes AND editorial opt-outs both remove the record.
  if (d.operation === 'delete' || d.allowIndex === false) {
    await algolia.deleteObject({indexName: INDEX, objectID: d._id})
    console.log(`Removed ${d._id} (${d.operation === 'delete' ? 'deleted' : 'allowIndex=false'})`)
    return
  }

  const record = {
    _type: d._type,
    _rev: d._rev,
    title: (d.title ?? '').slice(0, 500),
    slug: d.slug ?? '',
    excerpt: d.excerpt ?? '',
    tldr: d.tldr ?? '',
    content: (d.content ?? '').slice(0, MAX_CONTENT),
    category: d.category ?? null,
    tags: d.tags ?? [],
    author: d.author ?? null,
    publishedAt: d.publishedAt ?? null,
    publishedAtTimestamp: d.publishedAt ? Date.parse(d.publishedAt) : 0, // numeric, for ranking
    lastModified: d.lastModified ?? null,
    image: imageUrl(d.image?.assetRef),
    imageAlt: d.image?.alt ?? '',
  }

  const size = JSON.stringify(record).length
  if (size > 9000) console.warn(`Record ${d._id} is ${size}B — near the 10KB limit`)

  await algolia.addOrUpdateObject({indexName: INDEX, objectID: d._id, body: record})
  console.log(`Synced ${d._id} ("${record.title}")`)
})
```

## Step 4 — Backfill script (`apps/studio/scripts/algolia-initial-sync.ts` — NEW)

Same projection as the blueprint (drafts excluded via `!(_id in path('drafts.**'))`, plus `allowIndex != false`), fetched with `getCliClient()`, mapped with the same record shape, then `clearObjects` + `saveObjects` on `posts`. Export the shared projection string from one module if practical so Function and script can't drift. Run (HUMAN): `npx sanity exec scripts/algolia-initial-sync.ts --with-user-token` from `apps/studio`.

## Step 5 — Index settings as code (`apps/studio/scripts/algolia-configure-index.ts` — NEW)

`setSettings` on `posts`: `searchableAttributes: ['title', 'excerpt', 'tldr', 'content', 'tags.title', 'category.title', 'author.name']`, `attributesForFaceting: ['searchable(category.slug)', 'searchable(tags.slug)']`, `customRanking: ['desc(publishedAtTimestamp)']`. Run once by the human alongside the backfill.

## Step 6 — Swap the `/search` backend (`apps/blog/src/lib/blog-search.ts` — MODIFY)

**Read the whole file first.** Rules:

- Keep every exported symbol and its signature (`fetchSearchPage`, `parseSearchQuery`, `parseSearchFilters`, `parseSearchPage`, `searchPageHref`, `getSearchRobots`, types) — the page component must not change.
- Inside `fetchSearchPage`, branch: if `NEXT_PUBLIC_ALGOLIA_APP_ID` && `NEXT_PUBLIC_ALGOLIA_API_KEY` are set → Algolia path; else → the existing GROQ path **unchanged** (this is the CI/preview fallback; do not delete the GROQ code).
- Algolia path: `import {liteClient} from 'algoliasearch/lite'` (server-side call is fine), `search` on index `posts` with `query`, `page` (Algolia is 0-based — convert), `hitsPerPage` equal to the current page size, and map the existing category/date filters to `facetFilters` / numeric filters on `publishedAtTimestamp`. Map hits back to the exact result shape the page already consumes (post-card data), including total count for pagination.
- Robots stay `noindex, follow`; zero-results behavior unchanged.

## Step 7 — `.env.example` additions (MODIFY, comments + empty values only)

Document the four Algolia vars and note key hygiene (search key public, write key server-only).

## Verify (all must pass before PR is ready)

```bash
pnpm --filter @pakfactory/blog typecheck
pnpm --filter @pakfactory/blog build
pnpm --filter @pakfactory/studio typecheck   # if script is TS-checked
```

- `npx sanity functions test algolia-document-sync --document-id <real-dev-post-id> --dataset development --with-user-token` → record appears in Algolia dashboard; delete event removes it; `allowIndex=false` removes it.
- `/search?q=<known term>` locally with env vars set → Algolia-served results; without env vars → GROQ fallback works.
- Grep check: `ALGOLIA_WRITE_KEY` appears nowhere under `apps/blog/`.
- Spot-check largest post record < 10KB.

## Human-only steps (leave as PR checklist, do not attempt)

- `npx sanity blueprints init` decisions + `npx sanity blueprints deploy` (needs `deployStudio` grant)
- Backfill + index-settings script runs
- Vercel + Function env vars

## Out of scope — do not build

InstantSearch client UI, autocomplete, analytics wiring, other `_type`s, AI/answer search. If you hit a contradiction between this brief and an ADR or `AGENTS.md`, **stop and flag it in the PR** — don't resolve it silently.
