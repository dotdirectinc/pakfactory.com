# ADR-018: Admin search foundation (dual corpus + BFF)

**Status:** Accepted (2026-09-13). **Applies to:** `admin` (primary); content index contracts also affect `studio` / Sanity sync Functions and Algolia ops. First admin-tagged ADR in the register.

## Context

PakFactory Back Office (`apps/admin`) is where sales find and work client **requests**. Sales also need packaging **knowledge** authored in Sanity — products, customizations, blog posts, and case studies — in the same global search surface as RFQs.

Those answers live in different systems with different trust rules:

| | Operational data | Content / knowledge |
| --- | --- | --- |
| Source | Supabase (`rfq`, later customers / specs) | Sanity CMS |
| Sensitivity | PII, deal notes, assignee | Published (or publishable) marketing knowledge |
| Access today | RLS / adapter scoped by `assigned_owner_crm_id` | Public site + Studio; no per-rep filter |

The blog already uses Algolia for **post** typeahead (PROD-1957): shared record mapper, Sanity Function sync, browser `liteClient` with a **public** search-only key. Copying that pattern into admin for RFQs would leak cross-rep PII. Mixing RFQ fields into the `posts` index (or one mega-index) would permanently couple corpora.

We need one UX (Shopify-style open + Mobbin-style body) and a **foundation** later search work builds on — not ad-hoc indexes per feature.

## Decision

### 1. Dual corpus (two logical databases)

Admin search treats **ops** and **content** as separate corpora. Same Algolia application is allowed; **indexes and API keys stay partitioned**.

- **Ops indexes:** `admin_*` only (V1: `admin_requests`). Every request record includes `assignedOwnerCrmId`. Never write buyer PII into a content index.
- **Content indexes:** existing `posts` for `post`; new `content_products`, `content_customizations`, `content_case_studies` for Sanity `product`, `customizationOption`, and `caseStudy`. Never write RFQ/customer fields into these indexes.

Do **not** create a single `admin_all` (or similar) index that mixes emails/notes with post/product body text.

### 2. BFF-only search from the admin UI

All admin search queries go through an authenticated server route (e.g. `POST /api/search`). The browser sends `{ q, scope }` (and pagination); it does **not** hold a key that can read the full ops index.

- **Ops queries:** server-side Algolia (or a secured API key minted per session) with a **forced** filter `assignedOwnerCrmId:{session.zohoUserId}` from `requireInternalUser`. Defence in depth alongside Supabase RLS.
- **Content queries:** server-side (or BFF-held content search-only key). Any authenticated internal user may search published content; no assignee filter.
- **Pages:** static admin nav list filtered in process (not Algolia).

**Do not** embed the blog’s public `NEXT_PUBLIC_ALGOLIA_API_KEY` as the admin **ops** search key.

### 3. V1 searchable types

| Rail scope | Corpus | Source `_type` / table | Index (V1) | Result target |
| --- | --- | --- | --- | --- |
| Requests | Ops | Supabase `rfq` | `admin_requests` | `/requests/[id]` |
| Customers | Ops | — | stub (`admin_customers` reserved) | — |
| Specs | Ops | — | stub (`admin_specs` reserved) | future `spec_instance` |
| Products | Content | Sanity `product` | `content_products` | www `/products/<slug>` |
| Customizations | Content | Sanity `customizationOption` | `content_customizations` | www customization URL |
| Blog | Content | Sanity `post` | `posts` (reuse) | blog post URL |
| Case studies | Content | Sanity `caseStudy` | `content_case_studies` | www `/case-studies/<slug>` |
| Pages | Static | code | — | in-app routes |

Rail label **Products** means Sanity marketing products. Operational request-line specs use rail **Specs** (stub in V1) so the two are not confused.

Customization is a document family (`customizationCategory` / `customizationType` / `customizationOption`). V1 indexes **`customizationOption`** as the primary hit (slug + `allowIndex`). Category/type may appear later as facets or secondary hits without a new ADR if they stay on `content_customizations` (or a documented sibling index) under this decision.

Respect publish / `allowIndex` (and blog’s existing Algolia post filter) so drafts and noindex docs stay out of search.

### 4. Ranking when scope is All

1. Exact / strong Request matches (`ref`, company, email)  
2. Other Request matches  
3. Products / Customizations  
4. Case studies / Blog  
5. Pages / actions  

Never rank a content hit above an exact RFQ `ref` match.

### 5. UX contract

Global shell search:

- **Shopify open:** top-bar Search control + `⌘K` / `Ctrl+K` opens a dialog; focus and query continue as if still typing in the bar.
- **Idle (empty query):** Mobbin body — **left scope rail** + browse panel (recents, recent requests, pages; rail can narrow browse). No facet pills yet.
- **Typing:** switches to Shopify-style chrome — **facet pills with counts**, **labeled result groups**, optional **scope chip** in the input when a pill narrows the list. Left rail is hidden while typing.
- Stub scopes (Customers, Specs) stay honest empty / “Coming soon” when entered — not fake hits.
- Prefer composed admin modules + `@pakfactory/ui` Dialog over InstantSearch widget suites as the primary UI ([ADR-013](0013-shared-core-vs-feature-composition.md)).

### 6. Sync paths

- **Ops:** Supabase change → webhook / Edge Function / backend job → `admin_*` (`saveObject` / `deleteObject`). Soft-remove or re-filter when assignee changes.
- **Content:** keep the Sanity Function path for `posts`; add mappers + sync for `product`, `customizationOption`, and `caseStudy` following the blog record-module pattern (`packages/sanity` algolia helpers / configure + backfill scripts). Agents do not write Sanity documents ([`AGENTS.md`](../../AGENTS.md) § Sanity content — agent guardrails).

### 7. Fallback when Algolia is unset

- **Ops:** BFF filters `listForSalesMember()` in memory (same fields as the index contract).  
- **Content:** omit content sections or use a staff-only GROQ path — prefer Algolia once env is set.  
Keeps mock / CI / local UI workable without Algolia (same idea as blog’s GROQ fallback, different data plane).

### 8. Extension rule (binding for later search work)

Adding a searchable type requires **all** of:

1. Record mapper + index settings (ops → `admin_*`, content → `content_*` or documented reuse)  
2. Sync (or explicit “static / code-owned” for Pages-like entries)  
3. Rail scope **or** an explicit “All-only / no rail” note in a follow-up ADR amendment  
4. BFF section in the merge/ranking rules  
5. Update this ADR (amendment section or superseding ADR) — **no ad-hoc indexes** outside this foundation  

Cross-rep / org-wide **ops** search requires an explicit role/permission decision; it is not implied by this ADR.

## Consequences

- Admin’s first search feature and every later search feature share one architecture; AI and humans stop inventing parallel palettes.
- Content V1 needs new Algolia indexes and Sanity sync beyond `posts`; blog’s public typeahead key stays blog-only for ops safety.
- `docs/adr/README.md` gains an **admin** surface with this ADR as the search entry point.
- Fallback paths must stay tested so `ADMIN_DATA_SOURCE=mock` and missing Algolia env do not brick the shell.

## Out of scope (this ADR)

- InstantSearch as the mandated UI kit  
- Orders / Quotes search  
- Editing RFQs or Sanity documents from search  
- Customers / Specs index shapes (stub UI only until a follow-up amends §3)

## Amendments

### 2026-09 — Reserved ops indexes + shelf contract

Until Customers / Specs go live, reserved index names are `admin_customers` and `admin_specs` (constants in `apps/admin/src/lib/search/request-record.ts`). Stub UI copy, ticket hints, and the extension checklist live in `apps/admin/src/lib/search/shelf.ts` — promoting a stub still requires §8 in full; do not create those indexes or invent alternate names without amending this ADR.
