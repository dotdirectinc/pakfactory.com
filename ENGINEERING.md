# PakFactory — Engineering practices (agents)

**Read this before scaffolding React/Next features, choosing Client vs Server Components, or wiring shared UI.**

This file is the **practice** front door (how to build). [`docs/adr/`](docs/adr/README.md) remains the **decision** register (why). Visual tokens and composition: [`DESIGN.md`](DESIGN.md). Stack and domain canon: [`AGENTS.md`](AGENTS.md).

Doc map: [`docs/ai-agent-docs.md`](docs/ai-agent-docs.md).

---

## 1. Purpose

- Prefer **Server Components** and thin **client islands**.
- Keep state as local as possible; prefer the **URL** for shareable UI state.
- Scaffold blog UI with the **layer + reuse** rules below (ADR trail, not a merge of ADR files).
- Do **not** add `useMemo` / `useCallback` by default. React Compiler is **not** enabled in this repo.

---

## 2. Next.js App Router (RSC vs client)

Stack: **Next.js 16** App Router, **React 19**. Components are **Server Components by default**.

| Kind | Runs on server | Runs in browser | When to use |
| --- | --- | --- | --- |
| **Server Component** | Yes | No | Data fetch (Sanity/GROQ), layouts, static markup, SEO metadata |
| **Client Component** (`'use client'`) | Yes (SSR) | Yes | Event handlers, browser APIs, local React state, `next/navigation` hooks |

**Add `'use client'` only at the interactive boundary** — keep parents as Server Components and pass serializable props down. Do not mark a whole page client just to use one button.

**Cannot cross the RSC → client boundary:** event handler functions, non-serializable values. Use Server Actions (`'use server'`) when the client must invoke server mutations.

### `searchParams` / `params` (Next 16)

Page props are **Promises**. In a Server Component page:

```tsx
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const filters = (await searchParams).filters;
  // ...
}
```

In a Client Component page, resolve with React `use()` (page cannot be `async`). Prefer reading filter/sort/pagination from the **URL** in a server `page.tsx` and passing props into client islands when possible.

`useRouter` / `usePathname` / `useSearchParams` require `'use client'`.

---

## 3. State scope (narrow → wide)

Choose the **narrowest** store that works:

1. **URL** (`searchParams`, path segments) — filters, sort, pagination, shareable views.
2. **Local component state** (`useState`) — ephemeral UI (open/closed, draft input).
3. **Feature provider** — rare; only when many siblings under one feature share non-URL state.
4. **No default global client store** (Redux/Zustand/etc.) for marketing/blog UI.

**Approved Context pattern (www):** [`apps/www/src/lib/request/request-provider.tsx`](apps/www/src/lib/request/request-provider.tsx) — RFQ “Your Request” pool uses Context + `useSyncExternalStore`, with **`useMemo` on the context value** and **`useCallback` on stable actions** so consumers do not re-render on every parent render. That is the bar for feature providers — not a license for app-wide stores.

ADR-013: feature **controllers** in `modules/` own URL/data wiring; shared `ui/` primitives stay props-only.

---

## 4. Memoization and re-renders

| Do | Don’t |
| --- | --- |
| Stabilize **Context provider values** with `useMemo` / `useCallback` when the value is an object/functions (see React docs + www `RequestProvider`) | Sprinkle `useMemo`/`useCallback` on every prop “for performance” |
| Fix unnecessary re-renders by **narrowing state** or splitting components | Assume list re-renders mean you must memoize everything |
| Leave existing memoization in place unless you measured a change | Enable React Compiler here without a separate decision |

Reconciliation folklore (“keys must be array index”, “memo always helps”) is not a substitute for reading React/Next docs via Context7 when unsure.

---

## 5. Scaffold checklist (blog — current rules)

**Applies to:** `apps/blog` layers; **ADR-013** reuse doctrine applies across apps. `apps/www` folder migration to ADR-008 is deferred — still follow props-only / no cross-feature fork when composing.

**History (do not merge files):** [ADR-005](docs/adr/0005-component-organization.md) → [008](docs/adr/0008-component-archetype-grouping.md) → [011](docs/adr/0011-component-feature-layer-hybrid.md) → [013](docs/adr/0013-shared-core-vs-feature-composition.md); [007](docs/adr/0007-inline-single-route-page-views.md). Index: [`docs/adr/README.md`](docs/adr/README.md).

### Placement (first match wins — ADR-008)

1. Sanity page-builder item? → `components/blocks/` (mirrors Studio `schemas/blocks/`)
2. Site chrome (nav/footer/frame)? → `layout/`
3. Whole-page template shared by **2+** routes? → `views/`
4. Fetches/receives Sanity data or Server Actions / URL wiring? → `modules/`
5. Else presentational, props-only? → `ui/` (promote to `@pakfactory/ui` when a second app needs it)

**ADR-007:** a whole-page view used by **exactly one** route stays **inline in that route’s `page.tsx`**.

**ADR-011:** optional feature folder when a cluster spans 2+ layers on one page (`post/`); feature subfolder inside one layer at 3+ files (`modules/widget/`). **`blocks/` stays flat and sacred.**

### Reuse (ADR-013)

- Shared core → controlled, **props-only** `ui/` (or `@pakfactory/ui`).
- Feature owns data + URL in **`modules/`** controllers.
- **Never** import one feature’s controller/view into another; **never** fork a feature component — extract the shared core.

### Routing shell (ADR-005 retained)

- **`app/` is routing only** — no `_components/` under routes; import from `@/components/...`.
- `src/` = `app/` + `components/` + `lib/`.

### Naming

- Kebab-case file === exported component (`post-card.tsx` ↔ `PostCard`).
- **Prefix-first** stems so related files cluster (`post-`, `cta-`, `filter-`, `site-`, …).
- Sanity `_type` / titles / desk labels: **singular** — [ADR-014](docs/adr/0014-sanity-studio-naming.md).

### Page-builder wording

Until [ADR-015](docs/adr/0015-page-composition-sections-terminology.md) is **Accepted**, blog code/docs use **“block”** ([ADR-012](docs/adr/0012-page-block-terminology.md)): `components/blocks/`, `BlockRenderer`, Studio “Page blocks”. Do not rename `pageBuilder` in the dataset casually.

---

## 6. Data fetching (short)

- Prefer Server Components + `getSanityClient()` / `@pakfactory/sanity/queries` (`defineQuery`).
- Colocate reusable GROQ in `packages/sanity`; do not invent parallel query trees in apps.
- Agents **never** create/patch/publish Sanity documents — schemas in git only ([`AGENTS.md`](AGENTS.md) § Sanity content).

---

## 7. Agent prompts (do / don’t)

| Ask | Do | Don’t |
| --- | --- | --- |
| “Add a filter to the archive.” | Drive state from URL; wire in `modules/`; shared chrome in `ui/` | Import topic feature controller into search |
| “New homepage row from Studio.” | Add Studio schema under `schemas/blocks/` + matching `components/blocks/` | Drop a one-off block under `modules/` or `post/` |
| “Make this page interactive.” | `'use client'` on the smallest leaf | `'use client'` on `layout.tsx` / whole `page.tsx` without need |
| “Optimize re-renders.” | Narrow state; Context value identity only when providing Context | Blanket `useMemo` on every derived string |
| “Reuse the topic chips on 404.” | Extract/use props-only `ui/` primitive | Copy-paste `TopicRelatedPills` wiring |

---

## 8. Related

| Doc | Role |
| --- | --- |
| [`DESIGN.md`](DESIGN.md) | Visual language + tokens |
| [`docs/adr/README.md`](docs/adr/README.md) | Decisions by domain + Applies to |
| [`AGENTS.md`](AGENTS.md) | Stack, domain, JIRA, Sanity guardrails |
| [`apps/blog/CLAUDE.md`](apps/blog/CLAUDE.md) | Blog routes / SEO |
| [`apps/www/CLAUDE.md`](apps/www/CLAUDE.md) | www rebuild |
| [`.cursor/skills/tech-lead-frontend/SKILL.md`](.cursor/skills/tech-lead-frontend/SKILL.md) | Frontend review skill |
