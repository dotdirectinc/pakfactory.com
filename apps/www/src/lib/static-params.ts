/**
 * Pre-render a dynamic route's pages at build time, except on Vercel preview
 * builds (PROD-2979).
 *
 * Each pre-rendered catalog page queries Sanity's API CDN during the build.
 * With dozens of www preview builds a day (staging included), that made
 * previews the main driver of the project's CDN-request quota. On a preview the
 * loader is skipped and the pages render on their first visit instead (none of
 * these routes sets `dynamicParams = false`), then stay cached. Production
 * builds, and local `next build` (no `VERCEL_ENV`), pre-render as before.
 *
 * Override: set `WWW_PRERENDER_ALL=1` on a deployment (Vercel → Environment
 * Variables, then redeploy) to pre-render everything on a preview too, e.g. to
 * catch build-time render errors or to benchmark a fully pre-built staging.
 */
export async function staticParamsExceptPreview<Params>(
    load: () => Promise<Params[]>,
): Promise<Params[]> {
    if (
        process.env.VERCEL_ENV === 'preview' &&
        process.env.WWW_PRERENDER_ALL !== '1'
    ) {
        return [];
    }
    return load();
}
