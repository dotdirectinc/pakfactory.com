# Blog app — working memory

Last updated: 2026-05-25.

**AI / Jira binding rules:** [`docs/blog-3-jira-conventions.md`](../../docs/blog-3-jira-conventions.md) · [`CLAUDE.md`](./CLAUDE.md) · [`AGENTS.md`](../../AGENTS.md).

## PROD-1496 — Vercel deployment (approach A, implemented in repo)

**Jira:** [PROD-1496](https://dotdirect.atlassian.net/browse/PROD-1496) — T5.3 Configure Vercel deployment for `apps/blog`  
**Routing:** `basePath: '/blog'` — public URLs live under `/blog` on the deployment origin.

### What was shipped (code)

| Deliverable | Location |
|-------------|----------|
| `basePath` `/blog` | `next.config.ts` + `src/lib/base-path.ts` |
| Host redirect `blog.pakfactory.com` → `pakfactory.com/blog` | `vercel.json` |
| Turbo: blog build after workspace typechecks | `turbo.json` → `@pakfactory/blog#build` |
| `NEXT_PUBLIC_SITE_URL` in Turbo build/dev env | `turbo.json` |
| Local default origin includes `/blog` | `src/lib/site.ts` |
| Env example | root `.env.example` |

### Vercel project (dashboard + `vercel.json`)

| Setting | Value |
|---------|--------|
| Root Directory | `apps/blog` |
| Include files outside root | **On** |
| Install | `pnpm install --frozen-lockfile` (`vercel.json`) |
| Build | `pnpm turbo run build --filter=@pakfactory/blog` (`vercel.json`) |
| Ignore unchanged | `npx turbo-ignore @pakfactory/blog` (`vercel.json`) |
| Framework | Next.js — deployment is managed; no `start` on Vercel |
| Production `NEXT_PUBLIC_SITE_URL` | `https://pakfactory.com/blog` |

Preview deployments: enable on PRs; set preview Sanity vars as needed.

### Local URLs

| URL | Purpose |
|-----|---------|
| `http://localhost:3003/blog` | Index (default dev port; override with `PORT`) |
| `http://localhost:3003/blog/<slug>` | Post |

Set `NEXT_PUBLIC_SITE_URL=http://localhost:3003/blog` in root or `apps/blog/.env.local` for canonical/JSON-LD (or rely on default in `site.ts`, which uses `PORT` default **3003**).

### Verification

```bash
pnpm build:blog
pnpm dev:blog

curl -sI http://localhost:3003/blog | head -5
curl -sI 'http://localhost:3003/blog?page=2' | grep -i robots
```

After deploy:

```bash
curl -sI https://blog.pakfactory.com/ | grep -i location
curl -sI 'https://pakfactory.com/blog/' | head -5
```

### Ops follow-up

- [ ] Create Vercel project + env vars in dashboard  
- [ ] DNS for `blog.pakfactory.com`  
- [ ] Confirm `pakfactory.com/blog` is routed to this deployment (domain/path on blog project or www multi-zone rewrite)  
- [ ] Green production + preview builds  

---

## PROD-1495 — noindex rules on listing pages (implemented)

**Jira:** [PROD-1495](https://dotdirect.atlassian.net/browse/PROD-1495) — T5.2 Configure noindex rules across blog listing pages

### Purpose

Paginated archive and filtered listing URLs should not be indexed (`noindex, follow`). Only page 1 of each listing type (unfiltered) and individual post pages are indexable.

### What was shipped

| Deliverable | Location |
|-------------|----------|
| Robots utility | `src/lib/seo.ts` |
| Index listing metadata | `src/app/page.tsx` — `generateMetadata` + `searchParams` |
| Post metadata (indexable + OG/Twitter) | `src/app/[slug]/page.tsx` — `generateMetadata` |
| Excerpt for post descriptions | `packages/sanity/src/queries.ts` — `POST_BY_SLUG_QUERY` includes `excerpt` |

### `getBlogRobotsDirective()` rules

| Input | `index` | `follow` |
|-------|---------|----------|
| `kind: 'post'` | `true` | `true` |
| Listing, page 1, no filters | `true` | `true` |
| Listing, page ≥ 2 | `false` | `true` |
| Listing, any active filter query param | `false` | `true` |

**Listing kinds:** `blog_index`, `category`, `tag`, `author` (latter three ready for future archive routes).

**Filter query keys** (non-empty value → filtered): `tag`, `category`, `q`, `query`, `author`, `year`, `month`.  
**Not a filter:** `page` (pagination only) — parsed via `parseListingPage()`.

### Routes (with `basePath`)

| App path | Public URL (local) | Robots |
|----------|-------------------|--------|
| `/` | `/blog` | From `searchParams` |
| `/[slug]` | `/blog/[slug]` | Always index, follow |

### Related docs

- `CLAUDE.md` — AEO/GEO metadata contract for post pages.
- `.cursor/rules/blog.mdc` — quick rules for this app.

---

## PROD-1506 — Blog 404 + recovery rail (implemented)

**Jira:** [PROD-1506](https://dotdirect.atlassian.net/browse/PROD-1506) — S2.10 Blog 404 page

**Schema source:** `apps/studio/schemas` (`post`, `blogCategory`, `author.photo`) — not `studio-old` or stub `packages/sanity` post schema.

### What was shipped

| Deliverable | Location |
|-------------|----------|
| Global 404 | `src/app/not-found.tsx` — `noindex, follow` via `getBlogRobotsDirective({ kind: 'error' })` |
| Blog GROQ | `packages/sanity/src/queries/blog.ts` — categories + popular posts (month window, `publishedAt` fallback) |
| Data helpers | `src/lib/blog-data.ts`, `src/lib/blog-categories.ts` (studio slug fallback) |
| Recovery rail (reuse PROD-1503) | `src/app/_components/` — search, chips, popular rail, RFQ CTA, newsletter |
| Newsletter API | `src/app/api/newsletter/route.ts` — needs `NEWSLETTER_WEBHOOK_URL` |
| Author image field | `POST_BY_SLUG_QUERY` uses `author.photo` (studio `author` schema) |

### Popular posts

No `viewCount` on studio `post` yet. Rail uses posts with `publishedAt` in the current UTC month; if fewer than three, fills from latest published.

### Verification

```bash
pnpm dev:blog
curl -sI http://localhost:3003/blog/this-slug-does-not-exist | head -8
# Expect HTTP 404 and robots noindex on HTML (check page source or metadata)
```

### Ops follow-up

- [ ] Set `NEWSLETTER_WEBHOOK_URL` in Vercel when S2.1 webhook is ready
- [ ] Optional `NEXT_PUBLIC_WWW_URL` for quote CTA host
- [x] Full seed: `pnpm --filter @pakfactory/studio run seed` → `development` dataset
- [x] Blog dev supplement: `pnpm seed:blog-dev` → extra posts (3/category) + 5 industries

---

## PROD-1497 — Blog home page (implemented)

**Jira:** [PROD-1497](https://dotdirect.atlassian.net/browse/PROD-1497) — S2.1 Build `/blog` home page

**Schema source:** `apps/studio` — `post.featuredOnHome`, `post.category`, `blogCategory`, `industry`.

### What was shipped

| Deliverable | Location |
|-------------|----------|
| Home page rebuild | `src/app/page.tsx` — hero, industries, 5 category rows, newsletter, pillars, RFQ |
| Home data + order | `src/lib/blog-home.ts` — category slug order per AC |
| GROQ | `packages/sanity/src/queries/blog.ts` — featured, latest, by category, industries |
| Components | `home-hero`, `home-industry-strip`, `home-category-row`, `home-conversion-pillars`, `post-card` |
| Studio pin field | `apps/studio/schemas/post.ts` — `featuredOnHome` |
| Blog JSON-LD | `@pakfactory/seo` — `blog()` generator |
| Seed | `featuredOnHome: true` on `post-paperboard-guide` |

### Verify

```bash
pnpm dev:blog
open http://localhost:3003/blog
pnpm build:blog
```

### UI primitives (post-1497)

Marketing bands use `@pakfactory/ui` **`Card`**, **`Button`**, **`Badge`**, **`Input`** — see `CLAUDE.md` Components section. Conversion pillars, newsletter, and RFQ use `Card`; hero/post tiles use layout + `PostCard`.

### Ops follow-up

- [ ] Deploy studio schema (`featuredOnHome`) before editors can pin hero post in production dataset
- [ ] Confirm www industry URLs (`/industries/{slug}`) match marketing routes
- [ ] Category archive routes (PROD-1499) for “View All →” links

---

## Local dev — env, port, Sanity seed (2026-05-25)

### Default port

| Item | Value |
|------|--------|
| `apps/blog/package.json` | `next dev --port ${PORT:-3003}` |
| `site.ts` fallback origin | `http://localhost:3003/blog` when `NEXT_PUBLIC_SITE_URL` unset |
| Public URL | **`http://localhost:3003/blog`** only (`basePath` `/blog`; root `/` on the blog app returns 404) |

Do not use port **3001** unless you set `PORT=3001` explicitly (another service may already use 3001).

### Environment loading (critical)

The blog app must see Sanity credentials at **runtime**. Three layers work together:

| Layer | File / config | Role |
|-------|----------------|------|
| Turbo | `turbo.json` → `dev.dotEnv: [".env.local", ".env"]` | Injects **repo root** `.env.local` into `pnpm dev:blog` |
| Next | `apps/blog/next.config.ts` | `loadEnvConfig(repoRoot)` via `import.meta.url` (not `process.cwd()`) |
| Override | `apps/blog/.env.local` | Optional; **recommended** copy of `NEXT_PUBLIC_SANITY_*` + `SANITY_API_READ_TOKEN` |

**Studio is different:** `apps/studio/.env.local` is read by Vite only — keep `SANITY_STUDIO_PROJECT_ID` / `SANITY_STUDIO_DATASET` aligned with root (see `apps/studio/.env.example`).

**Symptom:** dev yellow banner — *Project: (missing) · Token: missing · Configured: no* → blog never loaded root `.env.local`. Fix `apps/blog/.env.local` and restart.

### Sanity dataset (local)

| Setting | Local dev value |
|---------|------------------|
| Project | `8293wrxp` (team project; match root `.env.local`) |
| Dataset | **`development`** (not `production` for day-to-day dev) |

Root `.env.example` defaults to `development`. Production dataset is for Vercel prod / preview only.

### Seed commands

| Command | What it writes |
|---------|----------------|
| `pnpm --filter @pakfactory/studio run seed` | Full catalog (~163 docs): capabilities, products, blog taxonomy, 3 base posts, settings. Idempotent `createOrReplace`. Reads root `.env.local`. |
| `pnpm seed:blog-dev` | Supplement: 12 extra posts (≥3 per category for home rows) + 5 industries. Script: `apps/studio/scripts/seed-blog-dev.mjs`. |

Token: `SANITY_API_WRITE_TOKEN`, `SANITY_TOKEN`, or `SANITY_API_READ_TOKEN` (repo scripts accept any of these for local dev).

After seeding, refresh Studio (`pnpm dev:studio`) and blog home.

### Troubleshooting empty home page

1. Open **`http://localhost:3003/blog`** (not `:3001`, not `localhost:3000/blog`).
2. Confirm banner shows **Project: `8293wrxp`**, **Token: set**, **Configured: yes**.
3. If not: sync env into `apps/blog/.env.local` from root (see `apps/blog/.env.example`).
4. Stop dev server → `rm -rf apps/blog/.next` → `pnpm dev:blog`.
5. Re-run seeds on dataset **`development`** if categories/posts are empty in Studio.
6. Watch terminal for `[blog-home] … failed:` (dev-only GROQ error logs).

### Dev-only home diagnostics

| Item | Location |
|------|----------|
| Yellow empty-state banner | `page.tsx` when zero posts in development |
| `noStore()` in dev | `blog-home.ts` — avoids stale empty RSC cache |
| `getBlogHomeDebugInfo()` | `blog-home.ts` — project/dataset/token for banner |

Remove or narrow the banner once local CMS connection is stable.
