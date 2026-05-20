# Blog app — working memory

Last updated: 2026-05-19.

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

### Vercel project (dashboard — ops)

| Setting | Value |
|---------|--------|
| Root Directory | `apps/blog` |
| Include files outside root | On |
| Install | `pnpm install --frozen-lockfile` |
| Build | `pnpm build --filter=@pakfactory/blog` |
| Production `NEXT_PUBLIC_SITE_URL` | `https://pakfactory.com/blog` |

Preview deployments: enable on PRs; set preview Sanity vars as needed.

### Local URLs

| URL | Purpose |
|-----|---------|
| `http://localhost:3001/blog` | Index |
| `http://localhost:3001/blog/<slug>` | Post |

Set `NEXT_PUBLIC_SITE_URL=http://localhost:3001/blog` in root `.env.local` for canonical/JSON-LD (or rely on default in `site.ts`).

### Verification

```bash
pnpm build:blog
pnpm dev:blog

curl -sI http://localhost:3001/blog | head -5
curl -sI 'http://localhost:3001/blog?page=2' | grep -i robots
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
