# Newsroom (PROD-2913, PROD-2918)

How the newsroom listing and press release pages are wired. The content model is PROD-2909 (Studio); this file is **www how-built** only.

## Surfaces

| Surface | Path / type | Notes |
| --- | --- | --- |
| Listing | `/newsroom` → [`src/app/(site)/newsroom/page.tsx`](../src/app/(site)/newsroom/page.tsx) | Breadcrumb + centred heading (route-owned), then the Announcements tab: year + category filters and list/grid toggle, **URL-synced** |
| Detail | `/newsroom/[slug]` → [`src/app/(site)/newsroom/[slug]/page.tsx`](../src/app/(site)/newsroom/[slug]/page.tsx) | Header (date, title, share), body, press boilerplate, then layout `sections[]` |
| Listing layout | singleton **`newsroomCatalogPage`** | `sections[]` below the list |
| Detail layout | **`newsroomDetailPage`** | Release picks a template; falls back to the Default layout id |
| Section | **`pressReleasesRow`** | Pinned releases win; empty = latest `count`, excluding the release being read. Not allowed on `home` |

Breadcrumb is `Home / Newsroom` (`/ title` on detail). A "Company" parent was dropped on 2026-10-14 — there is no Company page; the content team decides whether to add one (it would be a Main Website content page).

## Data seam (Sanity → UI)

| Layer | Location |
| --- | --- |
| GROQ | [`packages/sanity/src/queries/newsroom.ts`](../../../packages/sanity/src/queries/newsroom.ts), card projection in [`press-release-card.ts`](../../../packages/sanity/src/queries/press-release-card.ts) |
| Mapper | [`src/lib/newsroom/map-sanity.ts`](../src/lib/newsroom/map-sanity.ts) |
| API | [`src/lib/newsroom/newsroom.ts`](../src/lib/newsroom/newsroom.ts) — `getNewsroomCatalog()`, `getNewsItemBySlug()`, `getPressBoilerplate()`, sitemap + slug lists |
| JSON-LD | [`src/lib/newsroom/news-jsonld.ts`](../src/lib/newsroom/news-jsonld.ts) — `ItemList` (listing), `NewsArticle` + `BreadcrumbList` (detail) |
| Cache tag | `WWW_NEWSROOM_CACHE_TAG` — revalidated for `pressRelease`, `newsroomCatalogPage`, `newsroomDetailPage` and `settings` |

## Business rules

- **Only published-by-date releases show.** Every query gates `publishedAt <= now()`; scheduled drafts are off (PROD-2228).
- **Boilerplate** ("About PakFactory" + media contact) comes from Global Settings → Company, not from each release.
- **No Media Assets tab** — there is no content model for it yet.
- **Video heroes play inline**, like case studies: the shared `VideoFacade` (`components/ui/video-facade.tsx`) shows the poster with a play button and swaps in a `youtube-nocookie.com` embed on click. Poster: the Studio thumbnail, else YouTube's `maxresdefault`.
- **No read time** on the release page or in More announcements — removed per review (Eric, 2026-10-14); the queries no longer compute it.

## Components

Props-only shared UI (ADR-013) in `components/ui/`: `CatalogTabBar` (ui `Tabs`, line variant, underline on the rule), `ViewToggle`, `ArrowLink`, `ShareButtons` (house icon set: lucide + official X mark, same as the footer, blog and case studies). Newsroom-specific pieces live in `components/newsroom/`.

## Navigation

- Footer: the live footer is the Sanity **Website Navigation** document, which has no Company section yet — an editor adds the Newsroom link. The code fallback in `lib/www-nav.ts` already lists it.
- Header: no Company menu today (PROD-2909: a separate decision).
