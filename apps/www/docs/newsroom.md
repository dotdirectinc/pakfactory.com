# Newsroom (PROD-2913, PROD-2918)

How the newsroom listing and press release pages are wired. The content model is PROD-2909 (Studio); this file is **www how-built** only.

## Surfaces

| Surface | Path / type | Notes |
| --- | --- | --- |
| Listing | `/newsroom` → [`src/app/(site)/newsroom/page.tsx`](../src/app/(site)/newsroom/page.tsx) | Breadcrumb + left-aligned heading (route-owned), then the catalog tab strip (Announcements + count, list/grid toggle) and the tab's own heading with the Year filter. Year and view are **URL-synced**. Design: `2026-10-13_newsroom-design_2.html` |
| Detail | `/newsroom/[slug]` → [`src/app/(site)/newsroom/[slug]/page.tsx`](../src/app/(site)/newsroom/[slug]/page.tsx) | Header (date, title, share), body, press boilerplate (About PakFactory + Media contact, from Global Settings), then layout `sections[]`. Design: `2026-10-13_press-release-design_1.html` |
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
- **Press boilerplate** ("About PakFactory" + "Media contact"): the `###` end mark, both cards and their headings are code; the copy comes from **Global Settings → Company**: the About text from *Company description*, the email from *Contact info → Media enquiries email* Edited once, it changes every release, including past ones. **No fallbacks:** an empty description hides the About card, an empty media email hides the Media contact card, and a missing company name leaves the publisher out of the JSON-LD — nothing is hardcoded.
- **"See all announcements"** in a press release row shows only when more live releases exist than the row lists (`hasMore`, from a count query where the row is filled).
- **Cache keys are versioned** (`CACHE_VERSION` in `newsroom.ts`): the data cache stores mapped results and survives deploys, so bump it whenever the cached shape changes.
- **No Media Assets tab** — there is no content model for it yet.
- **Video heroes play inline**, like case studies: the shared `VideoFacade` (`components/ui/video-facade.tsx`) shows the poster with a play button and swaps in a `youtube-nocookie.com` embed on click. Poster: the Studio thumbnail, else YouTube's `maxresdefault`.
- **No read time** on the release page or in More announcements — removed per review (Eric, 2026-10-14); the queries no longer compute it.

## Components

Props-only shared UI (ADR-013) in `components/ui/`: `CatalogTabBar` (ui `Tabs`, styled like the customization catalog strip: full width, label + count, 4px primary bar), `ViewToggle`, `ArrowLink`, `ShareButtons` (house icon set: lucide + official X mark, same as the footer, blog and case studies). Newsroom-specific pieces live in `components/newsroom/`.

## Navigation

- Footer: the live footer is the Sanity **Website Navigation** document, which has no Company section yet — an editor adds the Newsroom link. The code fallback in `lib/www-nav.ts` already lists it.
- Header: no Company menu today (PROD-2909: a separate decision).
