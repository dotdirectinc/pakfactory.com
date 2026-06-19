# ADR-009: Blog pages content model (`blogPage`)

**Status:** Accepted (2026-06-12). Implements guard-railed CMS pages for the Blog workspace: singleton homepage, self-service landing pages, structured posts (not page builder), taxonomy-only category archives.

## Context

The blog homepage page builder shipped on `blogHomePage` (ADR-008 `blocks/` mirror). Product needs **many self-service landing/marketing pages** while keeping:

- **Posts** as fixed article skeletons (PROD-1490), not free-form section stacks
- **Category archives** taxonomy-only (no page builder on `blogCategory`)
- **Flat URL resolver** at `/{segment}` (PROD-1597): category → post today; landings must slot in safely

The www `page` document type is wrong for Blog — it targets marketing-site `pageType` values and does not fit the blog resolver or reserved-segment rules.

## Product decisions (ratified for implementation)

| Decision | Choice |
| -------- | ------ |
| Landing URL shape | **`/{slug}`** at root — insert `blogPage` lookup between category and post in the resolver; strict slug validation |
| Prefixed `/pages/{slug}` | Rejected unless product reopens — avoids collision but weak campaign URLs |
| Contribute route | **Stays a code route** (`/contribute`) — not migrated to CMS in this ADR |
| `pageRole: static` vs `landing` | Both exist in schema; Studio lists **Landing pages** and **Static pages** separately; same block allowlist initially |
| Draft workflow | **`publishedAt` required** for resolver + sitemap; unpublished docs invisible on site |
| Shopify analogy | Homepage/landings = **section-based page templates**; posts = **fixed article template** |

## Decision

Introduce **`blogPage`** document type with guard rails:

| Guard rail | Mechanism |
| ---------- | --------- |
| **`pageRole`** — `home` \| `landing` \| `static` | Studio structure filters; home = singleton only |
| **Singleton home** | Fixed document id `blogHomePage`; `pageRole: home`; no slug |
| **Slug validation** | Block reserved segments + known category slugs (shared list in `@pakfactory/sanity/blog-reserved-slugs`) |
| **Section allowlists** | `pageBuilderHome` (7 blocks) on home; `pageBuilderLanding` (CTAs, tag strip, rich text band) on landing/static |
| **Studio Pages group** | Homepage pin + filtered lists — not a blank “create anything” bucket |

**Deprecate `blogHomePage` document type** — same `_id`, migrated to `_type: blogPage`, `pageRole: home`. Legacy Hero/Spotlight/Sections fields and frontend `buildFallbackSections()` removed.

### URL resolution order (`/{segment}`)

```text
1. Static Next.js routes (win via App Router)
2. Known category slug → category archive
3. Published blogPage (landing | static) by slug → SectionRenderer
4. Post by slug → article
5. Redirect map → else notFound()
```

Posts and `blogPage` slugs must not collide — Studio validation blocks category + reserved slugs; post collision remains an editorial/redirect concern (ADR-003).

## Consequences

- [`apps/studio/schemas/blogPage.ts`](../../apps/studio/schemas/blogPage.ts) replaces [`blogHomePage.ts`](../../apps/studio/schemas/blogHomePage.ts)
- [`pageBuilderHome`](../../apps/studio/schemas/sections/index.ts) / `pageBuilderLanding` replace single `pageBuilder` on non-home docs
- GROQ: shared page-builder projection + `BLOG_PAGE_BY_SLUG_QUERY`, `BLOG_LANDING_PAGES_SITEMAP_QUERY` in [`packages/sanity/src/queries/blog.ts`](../../packages/sanity/src/queries/blog.ts)
- [`[category]/page.tsx`](../../apps/blog/src/app/[category]/page.tsx) resolves CMS landings before posts
- Sitemap includes published landing/static pages
- ADR-008 section registry pattern unchanged — add blocks in Studio + component + registry + GROQ branch

## Scope

Blog workspace + `apps/blog` only. Does not change www `page` type or category archive templates.

## Studio UX gate (2026-06)

Landing and static page lists are **hidden inside Pages** until design ships (`BLOG_STUDIO_LANDING_PAGES = false` in [`apps/studio/structure/index.ts`](../../apps/studio/structure/index.ts)). Editors open **Pages → Homepage** (singleton); `pageRole` and `publishedAt` are hidden on the home singleton. Schema, GROQ, and the `/{slug}` resolver remain — flip the flag and re-seed sample landings to restore full Studio UX.

**Insert menu:** Homepage `pageBuilderHome` uses `insertMenu.groups` tabs (Post / Tag / CTA; Studio always prepends All). Optional grid thumbnails: [`apps/studio/static/page-builder-thumbnails/`](../../apps/studio/static/page-builder-thumbnails/) + [`page-builder-preview.ts`](../../apps/studio/schemas/sections/page-builder-preview.ts).
