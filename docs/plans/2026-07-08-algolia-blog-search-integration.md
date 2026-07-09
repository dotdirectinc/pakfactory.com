# Algolia Blog Search — Initial Integration Plan

> **For:** Claude Code (or any builder agent) working in `pakfactory.com`
> **Date:** 2026-07-08 · **Status:** approved direction, staged build
> **Owner:** Richard (dev@dotdirect.ca)

## Context & decision

Add **Algolia** as the blog's search backend, replacing the GROQ `match` search behind the existing `/blog/search` page. Sync is **event-driven via a Sanity Function** (Blueprints) — the current official Sanity route — not the legacy `sanity-algolia` webhook package (do **not** install it). Algolia becomes a **derived index**: fed from Sanity on publish, never authored directly, always rebuildable.

Sequencing gates are **already satisfied** (verified 2026-07-08):

- **PROD-1490** (post document rebuild) — Ready for Release; `apps/studio/schemas/post.ts` has the full model (tabs, `tldr`, `faqItems`, `tags`, `category`, `lastModified`, `aiTraining`/`aiAnswering`, `seoFields`).
- **PROD-1503** (`/blog/search` page) — Ready for Release; UI exists (`apps/blog/src/app/search/page.tsx` + `lib/blog-search.ts`). Its Out-of-Scope note says full-text infra is a future enhancement — **this plan is that enhancement.** Keep the page's URL contract and UX; swap the data layer.

Reference implementation: Sanity's official guide + example repo `sanity-io/sanity-algolia-sync` and the `algolia-document-sync` Functions example (`github.com/sanity-io/sanity/tree/main/examples/functions/algolia-document-sync`).

## Repo facts the builder must respect

- **pnpm** only (never npm/yarn). Monorepo: `apps/blog`, `apps/studio`, `packages/{sanity,seo,ui}`.
- Read `AGENTS.md` + `docs/adr/README.md` first. ADR-005 (component organization: routing-only `app/`, components by feature), ADR-006 (tokens).
- **Commit mode:** check `./.claude/commit-mode.sh` — currently `mix-commiter` (multi-app commits allowed). Re-check before committing.
- **Sanity guardrails:** edit schemas/queries **in git only**; never create/patch/publish documents in any Sanity dataset. The Algolia backfill writes to *Algolia*, not Sanity — allowed, but a human runs it (see Stage 2).
- GROQ lives in `@pakfactory/sanity/queries`; data fetching in `apps/blog/src/lib/`; components never fetch.

## Prerequisites (HUMAN actions — block until done)

1. Create an Algolia application + index `posts` (free/build tier is fine to start). Note the **App ID**, **Search API key** (public), **Write API key** (secret).
2. Env vars — local `.env` + Vercel (blog project) + Function env:
   - `NEXT_PUBLIC_ALGOLIA_APP_ID`, `NEXT_PUBLIC_ALGOLIA_API_KEY` (search key — frontend-safe)
   - `ALGOLIA_APP_ID`, `ALGOLIA_WRITE_KEY` (secret — Function/script only; never `NEXT_PUBLIC_`)
3. Verify the Sanity plan supports **Functions/Blueprints** and note rate limits.
4. Toolchain: Sanity CLI ≥ 4.9 (`npx sanity@latest`), Node 22 (Functions runtime).

## Stage 1 — Sync infrastructure (Sanity Function)

**New files (repo root — blueprints live above the studio dir):**

- `sanity.blueprint.ts` — `defineBlueprint` + `defineDocumentFunction`:
  - `name: 'algolia-document-sync'`, `memory: 1`, `timeout: 10`
  - `event.on: ['create','update','delete']`
  - `event.filter: "_type == 'post' && defined(slug.current)"`
  - `event.projection` (record design — keep < 2KB target, 10KB hard limit):
    ```groq
    {
      _id, _type, _rev,
      title, "slug": slug.current, excerpt, tldr,
      "content": pt::text(body),
      "category": category->{title, "slug": slug.current},
      "tags": tags[]->{title, "slug": slug.current},
      "author": author->{name, "slug": slug.current},
      publishedAt, lastModified, _createdAt, _updatedAt,
      "image": {"assetRef": mainImage.asset._ref, "alt": mainImage.alt},
      "noindex": seo.noindex,          // verify exact path in lib/seo-fields.ts
      "operation": delta::operation()
    }
    ```
- `functions/algolia-document-sync/index.ts` — `documentEventHandler`:
  - `operation === 'delete'` → `algolia.deleteObject({indexName, objectID: _id})`
  - else → build record (truncate `content` to ~8,000 chars, `title` to 500; resolve image URL via `@sanity/asset-utils`; warn > 9KB) → `addOrUpdateObject`
  - **Skip/delete records where `noindex` is true** (treat as opt-out of search).
  - Deps: `algoliasearch` (v5), `@sanity/functions`, `@sanity/blueprints`, `@sanity/asset-utils`, `dotenv`.
- Add `ALGOLIA_*` placeholders to `.env.example` (or create one if the repo pattern allows).

**Verify:** `npx sanity blueprints deploy` is a HUMAN step (needs `deployStudio` grant). Builder tests locally first: `npx sanity functions test algolia-document-sync --document-id <real-post-id> --dataset <dev-dataset> --with-user-token` and `npx sanity functions dev`.

## Stage 2 — Backfill script

**New file:** `apps/studio/scripts/algolia-initial-sync.ts` (mirror the existing `scripts/*.mjs` conventions):

- `getCliClient()` from `sanity/cli`; fetch all published posts with the **same projection** as the Function (single source: consider exporting the projection from `packages/sanity/queries` so Function + script can't drift).
- Map → records (`objectID = _id`, same truncation), `clearObjects` then `saveObjects` on index `posts`.
- Run: `npx sanity exec scripts/algolia-initial-sync.ts --with-user-token` — **HUMAN runs this** (reads prod dataset, writes Algolia). Rerun whenever the projection/schema changes.

## Stage 3 — Swap the `/blog/search` data layer

**Modify (smallest possible diff — keep the shipped UX and URL contract of PROD-1503):**

- `apps/blog/src/lib/blog-search.ts`: replace the GROQ `match` fetch inside `fetchSearchPage()` with an Algolia **server-side** query (`algoliasearch/lite`, search key), preserving:
  - `?q={query}&page={n}` contract, existing sort/filter params, result count, pagination shape
  - zero-results state + "Popular this month" rail (unchanged)
  - `noindex, follow` robots (unchanged)
  - map category/date filters → Algolia `facetFilters`/`numericFilters` (configure `category.slug`, `tags.slug` as facets; `publishedAt` timestamp for ranking/filtering)
- Keep `parse*`/`searchPageHref` helpers; components should not change.
- **Fallback:** if Algolia env vars are absent, degrade to the existing GROQ path (env-gated), so preview/CI doesn't break.

Client-side InstantSearch (`react-instantsearch-nextjs`) is a **later enhancement**, not this build. Same for autocomplete and AI search (answer bar) — explicitly out of scope.

## Stage 4 — Verification checklist

- [ ] `pnpm --filter @pakfactory/blog typecheck && pnpm --filter @pakfactory/blog build` pass
- [ ] Function local test: create/update/delete a dev-dataset post → record appears/updates/disappears in Algolia dashboard
- [ ] `noindex` post never appears in the index
- [ ] `/blog/search?q=<known term>` returns relevant results; pagination + filters work; zero-results state intact
- [ ] Record sizes < 10KB (spot-check the largest posts)
- [ ] No secret key referenced anywhere under `apps/blog` (search key only)
- [ ] Algolia index config committed as code where possible (searchable attributes: title, excerpt, tldr, content, tags.title, category.title; custom ranking: `desc(publishedAt)`)

## Jira (per docs/blog-3-jira-conventions.md)

Suggested stories (create before building; confirm numbering against the board):

1. **Algolia sync infrastructure** — blueprint + Function + env wiring (Stage 1)
2. **Initial index backfill script** (Stage 2)
3. **Swap /blog/search to Algolia backend** (Stage 3)

Out of scope / future (do not build now): InstantSearch UI upgrade, autocomplete, search analytics wiring, other document types (products/capabilities), on-site AI search (answer bar) — tracked in the brain's roadmap.

## Open decisions (flag, don't decide silently)

- **Where the blueprint lives** in a Turborepo (root vs `apps/studio`): follow what `npx sanity blueprints init` produces; keep functions out of app build graphs.
- **Facet/ranking config as code** vs dashboard-only: prefer code (a small `scripts/algolia-configure-index.ts` using `setSettings`) so the index is reproducible.
- `_rev` in records: cheap insurance for sync debugging; include.
