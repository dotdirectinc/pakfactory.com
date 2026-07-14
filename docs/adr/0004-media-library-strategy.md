# ADR-004: Media library strategy — `sanity-plugin-media` with asset-level alt/caption

**Status:** Accepted (2026-05-29). Implemented in [PROD-1604](https://dotdirect.atlassian.net/browse/PROD-1604).

## Context

The content-team field spec ([`docs/pakfactory-content-team-fields-final.md`](../pakfactory-content-team-fields-final.md) § "Image Asset (Library)") requires:

- **Alt** (required), **caption** (optional), **descriptive filename** — captured **on the asset itself**, not per use, so the metadata follows the image wherever it's reused.

Refined editorial needs (from the PROD-1604 spec):

1. Upload images **from within a post** (per-document), and **also** from a **global / doc-type-independent** entry point in Studio.
2. **Browse all previously uploaded images** and **reuse them across document types** within the project.
3. **Cross-project** reuse is desirable *eventually*, not required now.
4. Image metadata (alt / caption) should live **on the asset**, so it follows the image wherever it's reused.

Pre-existing state:

- `post.mainImage` and `post.ogImage` had **no alt** fields at all.
- `bodyImage` had a required per-use alt (only inline body images).
- No global media browser; no asset-level metadata; no reuse path beyond the default in-field upload UI.

## Decision

**Option B — `sanity-plugin-media`** (third-party plugin, `^4.3.0`), project/dataset-scoped.

Concretely:

- Plugin registered in **all four workspaces** (`admin` / `blog` / `website` / `academy`) in [`apps/studio/sanity.config.ts`](../../apps/studio/sanity.config.ts). The dataset is the de-facto library scope; every workspace sees the same assets.
- The plugin contributes a global **Media** tool to Studio nav (browse / upload / search all assets) and an in-field asset source so any image field can pick from previously uploaded assets.
- **Asset-level metadata** is captured on `sanity.imageAsset` via the plugin's custom fields, with this editorial mapping: **alt → `altText`**, **caption → `description`**, **filename → `originalFilename`**.
- **Per-use overrides** on `post.mainImage` and `post.ogImage` (and `mainImage.caption`) in [`apps/studio/schemas/post.ts`](../../apps/studio/schemas/post.ts) — optional, falling back to the asset-level values. `bodyImage` keeps its required per-use alt unchanged (inline body images are the strongest a11y / SEO surface).
- Blog read path resolves the cascade in GROQ: `coalesce(per-use, asset->altText/description)` in `POST_CARD_FIELDS` and `POST_DETAIL_FIELDS` ([`packages/sanity/src/queries/blog.ts`](../../packages/sanity/src/queries/blog.ts)). [`apps/blog/src/lib/sanity-image.ts`](../../apps/blog/src/lib/sanity-image.ts) exposes `sanityImageAlt` (`server-only`). Server components read it directly; the author-posts client loader receives it through a serialized field so the client never pulls the `server-only` image module.
- Editor coaching for descriptive filenames lives in [`docs/pakfactory-content-team-fields-final.md`](../pakfactory-content-team-fields-final.md) § "Image Asset (Library)".

## Alternatives considered

### Option A — Sanity native Media Library (Enterprise)

Sanity's own first-party product (distinct from the third-party `sanity-plugin-media`). Cross-project asset library managed at the organization level via Sanity Manage / Dashboard.

- **Pros:** First-party, long-term roadmap support. The **only** option that satisfies cross-project asset sharing (need #3). Asset-level metadata on the canonical asset. Dashboard-grade UX.
- **Cons:** **Paid Enterprise add-on** — cost outweighs current need (cross-project is "eventually," not "now"). **Dashboard-only** management surface, separate from the Studio editorial UX. **Does not auto-migrate** existing project assets; assets stay where they are and migration is opt-in.
- **Verdict:** **deferred.** Documented upgrade path. Sanity publishes a *"Migrate from Media Plugin → Media Library"* guide that re-uploads assets and re-links references; non-trivial work that scales with asset count.

### Option B — `sanity-plugin-media` (chosen)

Open-source Studio plugin that adds a project-scoped media browser, in-field asset source, and configurable custom asset fields.

- **Pros:** **Free.** Satisfies needs 1, 2, and 4. The single dataset is the natural library scope — every workspace already shares it. Custom fields on `sanity.imageAsset` give true asset-level metadata that travels with the image. Native Studio UX (no Dashboard hop).
- **Cons:** **Project-scoped** — does not satisfy need #3. Third-party (not Sanity-maintained) — long-term support depends on the plugin author. Plugin-side "required" fields are UI hints, not publish-blocks enforced by the schema, so asset-level required-alt is a soft signal, not a hard gate.
- **Verdict:** **chosen.** Right shape for the current scope; the cross-project requirement isn't firm enough to justify the Enterprise jump.

### Option C — Per-use reusable object

Define a richer custom image object (alt / caption embedded), reused per-document — i.e. a fancier `bodyImage` applied everywhere.

- **Pros:** No new dependency; pure schema work.
- **Cons:** **No browser** for editors. **No real reuse** — each new usage re-enters alt / caption. Doesn't satisfy needs 1, 2, or 4. A regression vs. asset-level metadata.
- **Verdict:** rejected.

## Decision drivers

1. **Cross-project sharing is "eventually," not "now"** — no current need to pay for Enterprise.
2. **Asset-level metadata is non-negotiable** (need #4) — both A and B satisfy; C does not.
3. **Browse / reuse across doc types within project** (need #2) — A and B satisfy; C does not.
4. **No editor friction** — keep the upload / browse experience inside the Studio (B), not a separate Dashboard (A).
5. **Reversibility** — moving from B → A later is documented (re-upload + re-link). The asset-level field shape (`altText`, `description`) is the same concept on both sides, so blog GROQ / consumer code can largely survive a migration with field-name remapping rather than a full rewrite.

## Consequences

- **The dataset is the library scope.** Every workspace (`admin` / `blog` / `website` / `academy`) sees the same assets. That is the intent today; if workspace-level isolation becomes a requirement later, it likely arrives alongside RBAC (and Enterprise), which would reopen Option A.
- **Asset-level required alt is a soft signal**, not a hard publish-block. Where alt is non-negotiable (inline body images), **keep the per-use required field** as the real gate — that is why `bodyImage` was left untouched. For `mainImage` / `ogImage`, the override is optional and the asset-level value is the canonical source.
- **Blog GROQ owns the fallback chain** (`coalesce(per-use, asset->altText/description)`). Any new image-bearing query must include this projection; consolidate via the shared `POST_CARD_FIELDS` / `POST_DETAIL_FIELDS` fragments so the rule isn't re-derived per query.
- **Client-side image consumers** must not import the `server-only` `sanity-image.ts`. Resolve alt server-side and pass the string through the props boundary — established pattern from PROD-1501 (author posts loader) and reused here.
- **Future migration to native Media Library is non-trivial** and scales with asset count — revisit *before* the asset count grows large if cross-project looks likely. Asset count is the cost driver, not feature parity.
- **Editor coaching for descriptive filenames** is a documentation / behaviour ask, not enforcement. An upload-time soft warning on generic names (`IMG_*`, `DSC_*`, UUID-ish) isn't cleanly feasible — Sanity's validation can't dereference `asset->originalFilename` from a non-asset field at edit time.
- **The Media tool is exposed per workspace.** That is the intended behaviour; do not hide it per workspace unless an RBAC requirement emerges (and at that point we'd be reopening Option A anyway).

## Trigger to revisit

Re-evaluate **Option A (native Media Library)** when any of these becomes true:

- **Cross-project asset sharing** becomes a firm requirement (e.g. a second Sanity project needs to consume the same image catalog).
- The project moves to the **Enterprise plan** for other reasons (custom RBAC, SSO, SLA — see [ADR notes in `AGENTS.md`](../../AGENTS.md)). At that point the native library is bundled and the only marginal cost is the migration effort.
- The plugin stops being maintained, or breaks against a Sanity v6+ upgrade.

Re-evaluate **Option C** only if the plugin is removed for licensing or supply-chain reasons and a quick fallback is needed — but it's a regression on browse / reuse and should be treated as temporary.

## Implementation references

| Side | Branch | Commits | Key files |
|------|--------|---------|-----------|
| Studio (plugin + per-use override fields + filename guidance) | `feature/sanity-studio-ux` | `91bed87` + `4dea734` | `apps/studio/sanity.config.ts`, `apps/studio/schemas/post.ts`, `docs/pakfactory-content-team-fields-final.md` |
| Blog (GROQ cascade + helpers + consumers) | `feature/blog` | `fc4d55d` | `packages/sanity/src/queries/blog.ts`, `apps/blog/src/lib/sanity-image.ts`, `apps/blog/src/app/_components/post-card.tsx`, `apps/blog/src/lib/blog-author.ts`, `apps/blog/src/app/_components/author-posts-loader.tsx` |

Related docs: [`docs/blog-3-jira-conventions.md`](../blog-3-jira-conventions.md) § PROD-1604; [`docs/pakfactory-content-team-fields-final.md`](../pakfactory-content-team-fields-final.md) § "Image Asset (Library)". Jira: [PROD-1604](https://dotdirect.atlassian.net/browse/PROD-1604).
