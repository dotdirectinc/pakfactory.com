# apps/admin — PakFactory back office

Operational surface for www request data and internal staff login. Part of epic [PROD-2405](https://dotdirect.atlassian.net/browse/PROD-2405).

## What this app owns

- Internal staff sign-in — **Google**, gated on an enabled `internal_user` row, with no email-domain restriction (PROD-2512 / ADR-0016; staff use `dotdirect.ca` and `pakfactory.com`). Email + password renders only behind `ADMIN_LOGIN=true`; see [Sign-in](#sign-in).
- Read-only views of buyer requests scoped to the signed-in sales member (PROD-2417+). `staff` accounts (no Zoho id) see no requests.
- Operational data backed by the `pakfactory-web` Supabase project

## What this app does not own

- **Content editing** — Sanity Studio (`apps/studio`)
- **Buyer-facing marketing** — `apps/www`
- **Out-of-scope epic items** — e.g. PROD-2357 Customers, commissions, Zoho Books (see PROD-2405 epic description)

## Stack

Next.js 16, React 19, Tailwind 4, port **4000**. PR base: `www-new-release`.

## Packages

| Package | Role |
|---|---|
| `@pakfactory/request` | Request types, internal account model, read adapters |
| `@pakfactory/supabase` | SSR Supabase client + session helpers |
| `@pakfactory/auth-ui` | Shared login UI (props-only) |
| `@pakfactory/ui` | Design tokens and primitives |
| `@pakfactory/sanity` | Content search GROQ / Algolia record contracts (ADR-018) |

Does **not** depend on retired `@pakfactory/components` (use `@pakfactory/ui` / `@pakfactory/utilities`).

## Mock-first data layer (wire-up later)

Until PROD-2414/PROD-2415 land, admin uses **real Supabase auth** with **mock** internal-account and request reads.

| `ADMIN_DATA_SOURCE` | Internal account | Requests |
|---|---|---|
| `mock` (default) | `ADMIN_INTERNAL_ACCOUNT_ALLOWLIST` env | Fixtures in `@pakfactory/request` |
| `supabase` | `lib/adapters/supabase-internal-account.ts` (PROD-2415) | `lib/adapters/supabase-requests.ts` (PROD-2414/2415) |

**Wire-up contract:**

- **PROD-2415** — implement `createSupabaseInternalAccountAdapter()` (role + `zohoUserId` from Supabase; never `user_metadata`).
- **PROD-2414** — implement `createSupabaseRequestReadAdapter()` against the `requests` table + RLS.
- Flip `ADMIN_DATA_SOURCE=supabase` when both adapters are ready.

Factory: [`src/lib/adapters.ts`](src/lib/adapters.ts).

## Local dev

1. Root [`.env.local`](../../.env.local) must include `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` (same `pakfactory-web` project as www) when testing real login.
2. Copy [`apps/admin/.env.example`](.env.example) to `apps/admin/.env.local` (or set vars in root `.env.local`).
3. Run `pnpm dev:admin` from the repo root → http://localhost:4000.

### Dev auth bypass (local UI only)

Set in `apps/admin/.env.local` — **never in production**:

```env
ADMIN_DEV_BYPASS=true
ADMIN_DEV_BYPASS_ZOHO_USER_ID=zoho-user-sales-1
```

Active only when `NODE_ENV=development`, `ADMIN_DEV_BYPASS=true`, and not `VERCEL_ENV=production`. Opens http://localhost:4000 without login (the home dashboard); `/login` redirects home. Header shows **Dev Mode**. Logic: [`src/lib/auth/dev-bypass.ts`](src/lib/auth/dev-bypass.ts). Backend restores full auth on [PROD-2415](https://dotdirect.atlassian.net/browse/PROD-2415) in [`src/lib/auth/require-internal-user.ts`](src/lib/auth/require-internal-user.ts).

Without `ADMIN_DEV_BYPASS=true`, use real Supabase login: set `ADMIN_INTERNAL_ACCOUNT_ALLOWLIST` to `your-email@example.com:zoho-user-sales-1` and sign in on `/login`. Active `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` must be set in the repo root `.env.local` — run `pnpm env:staging` (or `pnpm env:prod`) if you only have `_STAGING` / `_PROD` suffixed keys.

`/login` offers **Google only** unless you also set `ADMIN_LOGIN=true` — a local machine with no staff Google session needs that flag to get an email + password form at all.

## Sign-in

Google is the sign-in path. **Two things are checked, both required: an `@dotdirect.ca` address AND an enabled `internal_user` row** (decided 2026-10-23, reversing PROD-2512's row-only rule). The row is what a person provisions; the domain keeps a mis-provisioned row (a customer address typed into `internal_user`) from admitting a non-employee, since www customers share the same Supabase auth.

- **One domain: `dotdirect.ca`.** `pakfactory.com` addresses are refused even with a row; staff sign in with their dotdirect.ca account. The constant and `isInternalEmail` live in [`src/lib/auth/internal-domain.ts`](src/lib/auth/internal-domain.ts) and are used by the callback, the password action, `requireInternalUser` (so an older session is refused on its next request) and the Google button.
- **`hd=dotdirect.ca` hint, plus `prompt=select_account`.** `hd` only filters Google's account picker; it is not a control, because the callback re-checks the domain. `select_account` still shows the chooser to someone with several Google sessions.
- **Roles** (`packages/domain` `InternalRole`): `sales` (scoped to a Zoho id; sees assigned requests) and `staff` (no RFQ scope; request views are empty). Spec-registry permissions are registry grants, not this role (ADR-0016 D4).
- **Sessions:** admin and the customer site share one Supabase project but keep **host-only** cookies (`packages/supabase/src/server.ts` sets no cookie `domain`), so the two sign-ins stay separate per host. Separation is not authorization: every staff decision checks the row server-side.

The check lives in [`src/app/auth/callback/route.ts`](src/app/auth/callback/route.ts), the one place a session is established, and sign-out happens **before** the redirect so no admin cookie survives a refusal. Every refusal returns the same message on purpose — "no account for this address" would confirm which addresses are staff.

### `ADMIN_LOGIN` — the email + password fallback

Unset, or anything but exactly `true`, and `/login` is Google-only. Set `true` to render the shared `LoginForm` alongside the Google button — for a machine that cannot complete a Google round trip, or to get in while OAuth is broken.

- **Server-side, not `NEXT_PUBLIC_`.** The page reads it and passes a boolean down; flipping it needs a redeploy, not a rebuild. Logic: [`src/lib/auth/password-login.ts`](src/lib/auth/password-login.ts).
- **The flag closes the server action, not just the form.** `signInInternal` re-checks it before touching Supabase — a server action is a POST endpoint whether or not a form renders.
- **The password path still requires an `internal_user` row.** www customers live in the *same* Supabase auth project, so without that check any buyer's password would open admin. Like the callback, it also requires an `@dotdirect.ca` address.
- There is deliberately **no forgot-password or sign-up link** in either mode. Those pointed into the customer app (`lib/www-links.ts`, deleted) and are how staff ended up in the buyer flows. `NEXT_PUBLIC_WWW_URL` is not read by admin.

## Shell chrome

Authenticated chrome is [`AdminShell`](src/components/layout/admin-shell.tsx): dark top bar + left sidebar + `rounded-t-xl` muted body (scroll in `<main>`).

| Piece | File | Notes |
| --- | --- | --- |
| Top bar | [`admin-top-bar.tsx`](src/components/layout/admin-top-bar.tsx) | ~60px tall; logo + Dev Mode badge; search absolutely centered (`max-w-2xl`); account menu on the right |
| Sidebar | [`admin-sidebar.tsx`](src/components/layout/admin-sidebar.tsx) | Shopify-style nested groups (Leads → Requests; Customization Library → Property Controls; Settings stub) |
| Account menu | [`admin-account-menu.tsx`](src/components/account/admin-account-menu.tsx) | **Identity + Sign out only** — do not duplicate sidebar destinations |

Global search open / dialog behavior stays under ADR-018 (below). Do not bake pixel heights or max-widths into ADRs; change chrome in these files.

## Dashboard UI scaffold (surfaces, modules, panels, widgets)

**Binding for agents and humans.** Admin dashboard UI uses SaaS / product-system language — not marketing “hero”, “case study”, or “section band” names.

| Layer | Meaning | File / export pattern |
| --- | --- | --- |
| **Surface / view** | Whole page type | `{feature}-view.tsx` → `HomeView` |
| **Module** | Related widgets on one surface | `{job}.tsx` under the feature folder → `MetricStrip` |
| **Panel** | Focused interactive block (assistant, filters) | `{name}-panel.tsx` → `PakAiPanel` |
| **Widget** | Props-only reusable tile | `ui/{name}.tsx` under the feature → `MetricStat` |

### Placement (agents must follow)

- Feature-cluster under `src/components/{feature}/` (e.g. `home/`, `requests/`).
- Modules and panels live **next to the owning surface**, not in a global `components/modules/` until a second surface imports them. “Module” is a **role name**, not a top-level folder.
- Widgets live in `{feature}/ui/` and stay **props-only** (no feature copy modules, no sample-metrics, no toast strings). Modules and panels own data wiring and Coming Soon.
- Do **not** create empty `components/modules/` or `components/ui/` “just in case.”
- Shell chrome stays in `components/layout/`. Do not call the shell a surface.
- Kebab-case file name === export stem (ADR-005). Drop redundant `{feature}-` prefixes inside that feature folder.
- Prefer `@pakfactory/ui` primitives (`Card`, `Button`, `Input`, `Badge`, `ChartContainer`). Do not edit existing `packages/ui` primitives for features.

### Promotion ladder (when reuse is real, not speculative)

| Trigger | Action |
| --- | --- |
| Second admin surface needs the same **module** | Move to `src/components/modules/{name}.tsx` |
| Second admin feature needs the same **widget** | Move to `src/components/ui/{name}.tsx` |
| Second **app** needs the same widget | Promote into `@pakfactory/ui` (ADR-019) |

Worked example: [`src/components/home/`](src/components/home/) — `home-view.tsx` (surface), modules (`metric-strip`, `greeting`, `insight-grid`), panel (`pak-ai-panel`), widgets under `home/ui/`.

## Dates and times — always local

Every date or time the admin shows goes through the shared helper, never `toLocaleString()` on its own: on the server that formats in UTC (Vercel), so times were hours off.

- Rendered: `<LocalTime iso={…} preset="dateTime" />` from `@pakfactory/ui/components/local-time`. It renders in the office zone (`America/Toronto`) on the server and on first paint, then switches to the viewer's own zone; the full date and zone is the tooltip.
- Plain strings (search subtitles, sentences, grouping keys): `formatDateTime(iso, preset)` from `@pakfactory/utilities/date-time`, which uses the office zone. For a string that should follow the viewer, pass `useViewerTimeZone()` as the zone.
- Presets live in `DATE_TIME_PRESETS` in [`packages/utilities/src/date-time.ts`](../../packages/utilities/src/date-time.ts). Add a new one there rather than formatting inline.

## Home

`/` is the staff home surface ([`HomeView`](src/components/home/home-view.tsx)). Layout: metric strip → greeting (signed-in display name) → PakAI panel + quick actions → insight grid. Built from `@pakfactory/ui` primitives plus home widgets.

Numbers in [`src/lib/home/sample-metrics.ts`](src/lib/home/sample-metrics.ts) are **sample**. Replace that file when analytics lands: GA4 for sessions and conversion rate, PostHog for product and customization popularity, and the request adapter for lead counts. PakAI suggestion pills run a **client mock** that generates mixed widgets (`pak-ai-presets.ts`); Recents / Add / Voice / View report still toast Coming Soon.

Sign-in returns to `/`. The sidebar Home link is only current on `/`.

## Requests index

`/requests` follows a Shopify Orders–style index: page title + All / local search strip + dense table in a white card ([`request-list.tsx`](src/components/requests/request-list.tsx)).

List rows use **`RequestSummary`** from [`@pakfactory/request/request`](../../packages/request/src/request.ts) (`contactName`, `timeline`, `lineCount`, `contactIndustry`, plus ref / company / email / entryKind / submittedAt). When extending the summary, keep mock [`toSummary`](../../packages/request/src/adapters/mock-requests.ts) and Supabase [`toRequestSummary`](src/lib/adapters/rfq-to-domain.ts) in sync.

Do **not** invent RFQ workflow statuses, metrics sparklines, Export/Create, or bulk checkboxes on the requests index until product asks. The home dashboard’s sample charts are the exception above.

## Global search (ADR-018)

Shell search (`⌘K` / top-bar) is governed by [`docs/adr/0018-admin-search-foundation.md`](../../docs/adr/0018-admin-search-foundation.md): dual corpus (ops Supabase vs content Sanity), BFF `POST /api/search`, owner-scoped requests.

| Corpus | Indexes | Sync | Query |
| --- | --- | --- | --- |
| Ops | `admin_requests` | Human backfill `pnpm exec tsx scripts/algolia-backfill-requests.ts`; webhook TBD | Algolia + `assignedOwnerCrmId` filter, else adapter list filter |
| Content | `posts` (reuse), `content_products`, `content_customizations`, `content_case_studies` | Sanity Functions `algolia-document-sync` + `algolia-content-sync`; studio configure/backfill scripts | Algolia first, GROQ fallback |

Env: `ALGOLIA_APP_ID`, search via `ALGOLIA_SEARCH_KEY` or `NEXT_PUBLIC_ALGOLIA_API_KEY` (server-only in BFF), write `ALGOLIA_WRITE_KEY` for scripts/Functions. Optional `ADMIN_WWW_ORIGIN` / `ADMIN_BLOG_ORIGIN` for outbound content links. Customers / Specs remain stubs — see `lib/search/shelf.ts`.

## Customer attachments

Files a buyer uploaded, on the request detail page. Everything uploadable is
browser-viewable — png, jpeg, webp, gif, pdf — so images render as thumbnails
with a lightbox, and a pdf gets a button rather than an embedded viewer.

Two mechanisms, deliberately different:

| | path | disposition |
|---|---|---|
| **View** | `GET /api/attachments/<rfqId>/<attachmentId>` (route handler) | `inline` |
| **Download** | `resolveAttachmentUrl` (server action, minted on click) | `attachment` |

### Why viewing needs a route handler

ADR-0013 D3 keeps presigned permits **out of the DOM**: one rendered into the
page is copyable, valid for anyone holding it, and expires after 300s while the
rep is still reading. An `<img src>` needs a url, so the naive way to add
previews is to mint a permit per file on load — which is exactly what D3 rules
out.

The route handler preserves it. What lands in the DOM is a **same-origin path**,
worthless without the admin session cookie. It authorises on every hit, mints a
fresh permit and 302s to it, so nothing is copyable and nothing goes stale while
the page sits open.

It answers **404** — never a redirect to `/login` — because the browser would
follow a redirect and render login HTML inside an `<img>`. A signed-out request,
a stranger's `rfqId` and a mismatched pair are all one answer.

### The gate

`authorizeAttachment` ([`src/lib/attachments/authorize.ts`](src/lib/attachments/authorize.ts))
is the single implementation, shared by both callers. The backend's
`/api/request/attachments/resolve` authorises the **service** (HMAC), not the
person — it trusts this BFF to have checked already, so a leaked
`SERVICE_SHARED_SECRET` would otherwise read every customer's artwork.

1. `requireInternalUser` — session + enabled internal account.
2. `getById(rfqId, zohoUserId)` — the same RLS path the page uses; null refuses.
3. The attachment must belong to that request.

`resolveFromBackend` ([`src/lib/attachments/backend-resolve.ts`](src/lib/attachments/backend-resolve.ts))
does the signing and authorises nobody. It is shared so the two paths cannot
drift on the signature — a signature subtly different in one of two places fails
as a 401 nobody can read.

### When downloads or previews fail

Both need `BACKEND_API_BASE_URL` and `SERVICE_SHARED_SECRET`. Without them the
file list still renders and only view/download fail; the log now names **which**
variable is missing.

The failure `reason` is coarse on purpose (`not_configured`, `unreachable`,
`unauthorized`, `not_found`, `backend_error`) — it is for our logs and for
choosing a status code, never for a message shown to a rep, since "not found"
would confirm which of the two ids was wrong.

⚠️ A **503 from the backend** is not an admin problem: it means the signature was
accepted and the API box itself failed to reach S3 or the database. On 2026-09-08
that was the box having no AWS credentials at all (no IAM instance profile), and
the reason was only visible in the box's own journal:

```
sudo journalctl -u pakfactory-api -n 200 | grep -A5 "failed to resolve an attachment url"
```

## Spec System — current rules

`/spec/rules` shows the customization rules **as they are now** (PROD-2560): read from Sanity with the storefront's rules query, widened to every option (`CATALOG_CUSTOMIZATION_RULES_ALL_OPTIONS_QUERY`: Not active only hides an option on the site, so its offers and pairs still show and can be edited, 2026-10-22; only "Configure as a customer" leaves Not active options out), and computed by the shared package (`@pakfactory/sanity/customization-rules/summary` → `summarizeRules`). Sanity is the source of truth for V1 (option A, 2026-09-18), so admin never computes rules itself and never stores the summary — it is recomputed on each load (60 s CDN revalidate).

| Tab | Shows |
|---|---|
| By type | who decides each type, and its requirements as written — "(Materials) and (Ink)" |
| By option | each option's partners grouped by type — "all", "all except …", or the short list — and which way the dependency runs |
| Product exceptions | every `customizationExceptions` entry and what it actually did |
| Needs attention | options paired with nothing, requirements an option can never meet, references to deleted options, pick-one sibling pairs, reference-only pairs |

- **Dataset is pinned to `development`** (`ADMIN_SPEC_RULES_DATASET` overrides) until the production fill runs (PROD-2596). It does not follow `NEXT_PUBLIC_SANITY_DATASET`, which would show an empty rule set on the deployed app.
- Gated like the rest of `/spec`: 404 without a registry grant.
- `/spec` (Registry) is the frames-to-approve page; see [Spec System — page speed and loading](#spec-system--page-speed-and-loading).
- An **Old explorer rules** tab lists the L1–L15 rules of the retired Property Controls sandbox and where each stands now (in Sanity · product data · builder UI · not modelled) — the gap list, not an implementation.
- Not built yet: "from board / changed in Studio" provenance, history (needs PROD-2559).

## Spec System — Products & Customizations (read-only until V1)

PROD-2614. The customer-facing view of the same rules, for staff: **read-only until V1** — edits happen in Studio, and every page links there.

| Route | Shows |
|---|---|
| `/spec/products` | every standard product: listed / derived / exception counts, filterable |
| `/spec/products/[id]` | **What it offers** (per type; each derived option names the partner that allows it; what the rules took away and why) · **Configure as a customer** · **Exceptions** |
| `/spec/customizations/[id]` | one option: its pairs, and every product that ends up offering it |

- **One read** for every Spec System page: [`lib/spec/rules-source.ts`](src/lib/spec/rules-source.ts) (memoised per request; same query family as the storefront).
- **Configure as a customer** runs `resolveWithSelections(…, { lookahead: true })` in the browser — the storefront builder's exact call — on the **whole** catalog with ids shortened to tokens (~245 KB). It is deliberately not pruned per product: pruning changes eligibility unless done exactly as www does, and a second copy of that is how two screens drift. Verified 2026-09-28 on development: 1,220/1,220 snapshot checks match the real-id resolution, and a rigid box, the tin and a pouch offer the identical options admin vs www.
- **Edit in Studio** links need `ADMIN_SANITY_STUDIO_URL` — the Studio serving the dataset admin reads. Unset, the link is hidden rather than pointing at the wrong dataset.
- Rules Sanity does not model (print sides, Pantone form logic, foam conditionals, tin sizes) are **left out**, not reimplemented.

### Loading speed (measured 2026-09-28, development)

- **Computed views are cached for 60 s** ([`lib/spec/cache.ts`](src/lib/spec/cache.ts), tag `spec-rules`): Current rules, option partners, product rows, each product and each customization. A miss costs the Sanity read (~0.9 s) and the package's work; a hit costs neither. Failures are never cached. The raw Sanity response is **not** cached — at ~2.4 MB it is over Next's 2 MB data-cache limit.
- **Load on demand:** By option sends headings only (partner lines via `GET /api/spec/options/[id]/partners` when a row opens); the configurator catalog comes from `GET /api/spec/rules-snapshot` when "Configure as a customer" first opens, once per browser session. Both 404 without a registry grant.
- **Payloads:** Current rules 432 → 68 KB; product page ~285 → 38 KB; customization page 11 KB; products list 109 KB (all rows, so the filter searches everything; drawn 50 at a time with **Load more**).
- Current rules' tab is in the URL (`?tab=options`), and `/spec/rules/loading.tsx` shows the page's header and a skeleton while a view builds.

## Spec System — Spec Map (read-only)

PROD-2960 (#836, #837, #839). `/spec/map` draws the Catalog as a diagram: one stream at a time (Products / Customizations / Solutions tabs), one column per level, arrows parent → child. Same levels and records as `/spec/catalog`; nothing is editable.

| File | Role |
|---|---|
| [`lib/spec/spec-map.ts`](src/lib/spec/spec-map.ts) | One cached Sanity read: every record as a card, arrows as `[parent, child]` indexes (~3,000 cards, ~6,600 arrows) |
| [`components/spec/spec-map.tsx`](src/components/spec/spec-map.tsx) | Layout from fixed card heights (no layout library), selection, glide, lines |
| [`app/(admin)/spec/map/actions.ts`](src/app/(admin)/spec/map/actions.ts) | `loadMapRecord` (the panel — the shared record view, [`spec-record-view.tsx`](src/components/spec/spec-record-view.tsx)) and `loadMapCompatible` (from the rules) |

- **Eric's rules (2026-10-09):** colour means status (green active, yellow active internal, red not active, grey other); levels are told apart by number and icon; no zoom or pan, columns fill the width; a click gathers the related cards at the top, gliding from where they were on screen, and hides the rest; the record panel slides in beside the map. Lines are angled and share a trunk per column.
- **A focused standard product** gets an **Offered customizations** column right after it, from `getProductView` (`resolveForProduct`, the same engine as Studio's product view). Three groups — Direct (`listed`, solid line), Derived by rules (`derived`, dashed), Added by exception (`added`, dotted) — each collapsible with a count; only Direct starts open. Inside a group, options sit under their customization type (taken from the map's own type → option arrows). A filter box narrows by option name or code (not type names); kind chips in the focus bar show one kind. Removed options and derived options' partners are not drawn — the product's rules view lists them. Property-value lines bridge over the column just under the headers.
- **Column names** on the Products tab are short (Lines / Styles / Standard / Property values, `MAP_LABEL`); the full name is the header's tooltip, and the Catalog and panel keep theirs.
- **Moving records (PROD-3007, PROD-3095):** "Move records" makes the map editable: drag a card onto a new parent (`dropMove` / `MOVE_PARENT` in `spec-map.tsx`, `lib/spec/spec-map.ts`). Pairs: style → line, standard product → style, option → type, type → category, inspiration product → solution or standard product (its base), solution style → solution. The Catalog's Catalog structure has the same moves as dropdowns, and a parent's children table has "Add to …" (one per child level: a solution has solution styles and inspiration products). Moves join the rule-edit pending set and become one frame (server `POST /api/v1/rule-edits`). An inspiration product dropped on a solution style is refused with a note: membership comes from the style's filter, edited in Studio. **A product moved to another line or base takes a new SKU** (backend 20261022200000; its old SKU is retired for good): the server's check answers `skusNeeded`, the impact box's **New SKUs** asks for one per product the set moves (followers included, `SkusBox` in `rule-edit-session.tsx`), and Submit stays disabled until every one is accepted. The SKUs go to the server as `skus` (registry product id → SKU).
- **Browser checks:** scroll the map with JS (`area.scrollTop`) — the scroll tool misses the inner container. The glide uses timers, not animation frames, because a background tab pauses frames.

**Sidebar (Spec System):** Map / Catalog / Registry / Rules / Help. The Spec System group shows only when `/api/spec-me` returns a role. The admin layout fetches draft changesets (`listDraftChangesets`, at the same time as the sign-in and Spec access checks); when any exist, Registry is bold with a count pill. Unreachable registry → no pill. The count refreshes on reload or after a frame is decided, not in the background.

## Spec System — page speed and loading

PROD-3113 (2026-10-19). Every admin page loads in about 0.6–1.1 s on staging (was 1.6–6.4 s).

**Shared layout** ([`app/(admin)/layout.tsx`](src/app/(admin)/layout.tsx)). The sign-in check, Spec access (`fetchSpecMe`) and the sidebar's waiting count run **together** (`Promise.all`), so the layout costs the slowest one (0.4–0.85 s), not the sum.

- `loadSession` in [`lib/auth/require-internal-user.ts`](src/lib/auth/require-internal-user.ts), `fetchSpecMe`, `listDraftChangesets` and `listSyncRuns` are wrapped in React `cache()`, so a page that needs the same data again in one request reuses it.
- Spec pages start their own load **alongside** the access check: `const [, res] = await Promise.all([requireRegistryGrant(), load()])`. The grant still decides what renders, so a page without access shows nothing.
- Each remaining step is one Vercel → Supabase / registry round trip (~250–450 ms warm). The first request after a deploy or idle spell is slower (cold start).

**Server side** (`pakfactory.com-server` `src/middleware/principal.ts`). The registry grant is read in the same round as the staff lookup. A verified token is remembered for **60 s, for reads only** (GET/HEAD). Accepted trade-off: a signed-out session can still read registry data for up to 60 s; writes always re-verify, and a removed grant applies at once.

**Registry page** ([`app/(admin)/spec/(registry)/page.tsx`](src/app/(admin)/spec/(registry)/page.tsx), sections in [`components/spec/registry/`](src/components/spec/registry/)). Overview in priority order: waiting frames → sync problems → at most 3 recent syncs and approvals. Edit history (`?view=history`, "Show more" adds `?n=`) and Settings (`?view=settings`) load only when opened. Each section has its own `Suspense` keyed by tab, so switching tabs shows placeholders at once.

**Loading states** ([`components/ui/page-skeleton.tsx`](src/components/ui/page-skeleton.tsx)). Use these, never empty space:

| Export | Use |
|---|---|
| `PageSkeleton({ variant })` | a route's `loading.tsx` — `table`, `detail`, `map`, `sections`, `list`, `article` |
| `SectionSkeleton({ rows, title, label })` | a `Suspense` fallback for one section; shows a labelled frame |
| `InlineLoading` | a spinner + words inside a client component while it fetches |

Every real route has a `loading.tsx`; routes that only redirect have none.

**Page headers and first paint** (2026-10-20, admin #904, #906). A page's header is [`PageHeader`](src/components/ui/page-header.tsx): back link, title, badge, the description, an action. The description is [`PageLead`](src/components/ui/page-lead.tsx): two lines, "Read more" only when longer, and it closes again on any scroll (the Spec Map's columns included), click or focus elsewhere.

- **The `loading.tsx` renders the same `PageHeader`** (`PageSkeleton`'s `header` prop) with the real title and description, which are fixed copy; an action that needs data stands in as `ActionSkeleton`. The description is usually the page's largest text — its LCP — so it paints with the first frame. `/spec` was 2.45 s when it waited behind a skeleton; 0.1 s on a local production build after.
- **A `loading.tsx` must never wrap other pages.** On a first load the outermost `loading.tsx` on the path is what shows, so a parent's loading state stands in for its children (`/spec/map` showed the Registry's header). A route with pages below it keeps its page and `loading.tsx` in a **route group** of their own: `(admin)/(home)`, `spec/(registry)`, `spec/catalog/(tables)`, `requests/(list)`. URLs do not change.
- Check it with the page's HTML: with hidden blocks (`<div hidden id="S:…">`) and scripts removed, the page's own `<h1>` and description should be there.

**Measuring.** `lib/perf/timing.ts` logs `[timing] layout … · user … · specMe … · drafts …`, and `lib/spec/registry-api.ts` logs `[timing] api GET <path> <status> <ms>`. Read them with the Vercel CLI (the Vercel MCP connector cannot see this team):

```
vercel --scope pakfactory-projects-00b54385 logs --project pakfactory-com-admin --since 30m --query timing
```

Page times: a `fetch(path, { cache: "no-store" })` loop from a signed-in tab. A background automation tab cannot measure browser-side time: Chrome slows its timers to once a second.

## Spec System — changes from Sanity

PROD-3096 / PROD-3119 (2026-10-20). Sync Changes applies names, status and content that Sanity owns with no frame (server `docs/catalog-sync-v2.md` § 11); the admin shows them:

- **Sync history** ([`/spec/syncs`](src/app/(admin)/spec/syncs/page.tsx), [`spec-sync-history.tsx`](src/components/spec/spec-sync-history.tsx)): each Sync Changes run says "N changes from Sanity applied automatically", any that could not apply, and its Content line (differences by kind). **Show the changes** (`?applied=<run>`) loads that run's list only when opened (`GET /api/v1/sync-runs/:id/applied`); the history list itself carries counts only.
- **A record's page** ([`catalog/[table]/[id]`](src/app/(admin)/spec/catalog/[table]/[id]/page.tsx)): "Changes from Sanity" under the record, newest first, each with its run (automatic, or who started it) and time — from the audit trail (`GET /api/v1/records/:id/sync-changes`, registry id). Loaded in its own `Suspense`, so the record renders first.
- **A product's SKU history** (editors, 2026-10-22; backend #375): standard and inspiration product pages have "SKU history" above it — each SKU the product gave up, `COR-006-BR1 → FCT-084-BR1`, or "retired — product deleted" (`GET /api/v1/records/:id/sku-history`, from `product_sku_retired`). A server without the route reads as no history.
- **SKU first, codes searchable** (Richard, 2026-10-22): a product or inspiration product shows its SKU before its registry code — emphasized on record pages (`SpecRegistryId sku`), alone on Map cards (one reference fits), first column in the Products and Inspiration tables. Catalog search always matches name, SKU and registry code whatever columns are shown; Map search and every rule picker match codes too (`Choice.keys`).
- **Bulk rule editing** (Richard, 2026-10-22): the rule `Picker` adds as you go — Enter or Tab adds the highlighted match and keeps the box focused, ↑/↓ move, and "Add all N matching" adds every match (type a type's name for all its options). `multi={false}` for the exception picker. On the Map, each edit column has a "Show hidden N" switch on its header (a product's Offered customizations; an option's Compatible with and Offered on products): it puts the records that column leaves out back into the column (`hiddenFor` / `hiddenShown`): dashed, in their usual groups (a product's under a "Not offered" heading, first under the filter, with the offer kinds folded until it is hidden again), matched by the column's filter, each with a + at the top right to offer it or make it compatible (the map's own ⊕ corner button), then the usual ↺ undo once it is in the tray. "Show everything" is unchanged — it still clears the focus.
- Wording in [`lib/spec/sync-applied.ts`](src/lib/spec/sync-applied.ts) (tested): "Removed White", "Slug: old → new", facts as "label value".

### Sync from Notion picks its fields; a finished sync says so (2026-10-21)

- **Sync Notion is a dialog** ([`spec-notion-sync-dialog.tsx`](src/components/spec/spec-notion-sync-dialog.tsx), from the avatar menu and Re-sync on a Notion frame). The person ticks the field groups Notion owns for that run (names, status, parents, appears in, website copy, product details, solution axis, property values added); they go as `notion_fields` and **every** difference in them is proposed, decided before or not (server `docs/catalog-sync-v2.md`, note above § 0). Day to day Studio owns copy, product details and the solution axis. Group ids: [`lib/spec/notion-fields.ts`](src/lib/spec/notion-fields.ts) — client-safe, because `registry-api.ts` is server-only.
- **Paused automatic syncs say so** (PROD-3203, 2026-10-28). While a sync frame is a draft, an automatic run loads nothing (`result.skipped`, server `app.replace_sync_drafts`). The Registry's Waiting for review shows a notice per dataset whose newest automatic Sanity run was skipped — since when and how many — while any frame still waits ([`pausedSyncs`](src/lib/spec/sync-runs.ts)). Before this, a Studio deletion's frame stayed missing with nothing on screen until someone ran Sync Changes.
- **A finished sync says so.** Whoever starts a run (Sync Changes, the dialog, Re-sync) calls `watchSyncRun(id)` ([`lib/spec/sync-watch.ts`](src/lib/spec/sync-watch.ts)); [`SyncRunWatcher`](src/components/layout/sync-run-watcher.tsx) in the shell follows it from any page (3 s, `sessionStorage`, 20 min cap), then toasts what it produced with **Open Registry** and calls `router.refresh()` — which also updates the sidebar's waiting count. Before this, only the Registry and Sync history pages refreshed themselves.
- **Help → Who owns what** ([`spec/help`](src/app/(admin)/spec/help/page.tsx), `#owners`): the field-ownership table and how fast each direction travels. Keep it in step when ownership or sync behaviour changes.

## Customization Library

| Route | Role today |
| --- | --- |
| `/customization-library/property-controls` | **Control gallery** — every shared `PropertyController` kind with demo values ([`control-gallery.tsx`](src/components/customization-library/control-gallery.tsx), data in [`lib/customization/control-gallery-data.ts`](src/lib/customization/control-gallery-data.ts)). A design reference, **not rules**. |

Formerly **Property Controls**, a React port of the draft HTML explorer with its own catalog rows, a sandbox that applied hand-written rules L1–L15, and DEPS/LOGIC tables. Retired 2026-09-28 (PROD-2614, agreed with Richard Chang):

- the sandbox → **Spec System → Products → Configure as a customer**, on Sanity + the shared rules package (the storefront builder's own call);
- the L1–L15 rules → **Spec System → Current rules → Old explorer rules**, each with where it stands now; rules Sanity does not model are not reimplemented;
- deleted: `rules-data.ts`, `sandbox-engine.ts`, the sandbox/rules/catalog sections, the rule text in the gallery data, and `public/customization-logic-explorer.html`.

The old structure map ([`docs/configurator-html-structure.md`](docs/configurator-html-structure.md)) is kept as history. Shared field dispatcher: `@pakfactory/ui` `PropertyController` (admin `CatalogControl` re-exports it).

## Troubleshooting

### Login page error: Supabase URL and Key required

Root `.env.local` may list `NEXT_PUBLIC_SUPABASE_URL_STAGING` without the active `NEXT_PUBLIC_SUPABASE_URL`. Apps read the unsuffixed keys only. Fix: `pnpm env:staging` from the repo root, then restart `pnpm dev:admin`. Or skip login for UI work with `ADMIN_DEV_BYPASS=true` in `apps/admin/.env.local`.

### HTTP 431 or redirect weirdness

**HTTP 431 (Request Header Fields Too Large)** usually means the browser is sending oversized `Cookie` headers. Admin and www share the same `localhost` Supabase cookies (port does not isolate cookies on localhost), so a prior redirect loop or a www buyer session can leave bloated `sb-*-auth-token*` chunks.

**Recovery (one-time):**

1. Chrome → DevTools → Application → Cookies → `http://localhost` → delete all entries (especially `sb-*-auth-token*`).
2. Or use an incognito window.
3. Restart `pnpm dev:admin` and open `http://localhost:4000/login` first.

Non-internal sessions are cleared via [`src/app/auth/sign-out/route.ts`](src/app/auth/sign-out/route.ts) (Route Handler), not in Server Components — `signOut()` during RSC render cannot write cookies.
