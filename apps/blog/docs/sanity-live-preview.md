# Sanity live preview (Presentation) — setup & gotchas

How the blog connects to Sanity Studio's **Presentation** tool for live, click-to-edit preview, and the traps we hit wiring it up. Sister config lives in the Studio repo (`apps/studio/sanity.config.ts` `presentationTool` + `presentation/locations.ts`).

## How it works
- The Studio's Blog workspace has a **Presentation** tool pointed at this app's origin (`SANITY_STUDIO_PREVIEW_URL_BLOG`).
- It loads the blog in an iframe and calls **`/api/draft-mode/enable`** to turn on Next.js draft mode, then renders with `@sanity/visual-editing` overlays.
- Draft reads + stega (click-to-edit field mapping) come from `getPreviewableSanityClient()` in `src/lib/sanity/client.ts`; the canonical post fetch (`blog-post.ts`) uses it. Other callers keep the sync `getSanityClient()`.

## Required env (local `.env.local` and Vercel)
- `NEXT_PUBLIC_SANITY_PROJECT_ID`, `NEXT_PUBLIC_SANITY_DATASET` — must match the **Studio's** project/dataset, or preview 401s ("Session does not match project host").
- `SANITY_API_READ_TOKEN` — a **Viewer** token minted **under the same project**. A token from a different project fails auth.
- `NEXT_PUBLIC_SANITY_STUDIO_URL` — the Studio origin (`http://localhost:3333` dev, `https://pakfactory.sanity.studio` prod) so overlay clicks open the right Studio.
- CORS: add the Studio origin **and** this app's origin to the project's CORS origins (manage → API), with **Allow credentials**.

## Gotchas (learned the hard way)
1. **Never import `next/headers` at module top-level in `client.ts`.** It's server-only; a top-level import poisons the module for any client-side importer (e.g. `urlFor`) and the **production build fails** (`client.ts:2`). Import it lazily inside the async function: `const { draftMode } = await import("next/headers")`. Dev tolerates it; prod build does not.
2. **Declare env vars in `turbo.json`.** Turborepo strips undeclared env from task environments — even if the build compiles, `SANITY_API_READ_TOKEN` won't reach it and reads 401. They're in `turbo.json` `globalEnv`. A task-specific override (e.g. `@pakfactory/blog#build`) *replaces* the generic task's `env`, so rely on `globalEnv` or re-list them.
3. **Adding a dependency requires a lockfile update.** Vercel CI runs `pnpm install --frozen-lockfile`; after editing `package.json`, run `pnpm install` and commit `pnpm-lock.yaml` or the build fails with `ERR_PNPM_OUTDATED_LOCKFILE`.
4. **`allowOrigins` on the Studio side.** If the preview navigates to an origin other than the configured `previewUrl.origin` (e.g. localhost vs Vercel), the Studio blocks it — add it to `presentationTool` `allowOrigins`.
5. **Project must match end-to-end.** Studio project/dataset, blog env, and the read token must all be the **same project** (we consolidated on `8293wrxp` / `development`). Mismatches surface as `SIO-401-AWH` or a preview stuck on `/api/draft-mode/enable`.
