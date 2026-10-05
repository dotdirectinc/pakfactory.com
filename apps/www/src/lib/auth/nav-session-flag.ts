/**
 * Pre-paint session flag for the `(site)` header (PROD-2754). Plain module (no
 * `'use client'`) so the server layout gets the real strings, not client
 * references. See `use-nav-account.ts` for the browser-side account state.
 */

/** Wrapper id the pre-paint flag script marks (see {@link NAV_SESSION_FLAG_SCRIPT}). */
export const NAV_SESSION_WRAPPER_ID = 'pf-nav-session';

/**
 * Inline script rendered right inside the header wrapper. Before first paint
 * it marks the wrapper when a Supabase auth cookie is present
 * (`sb-<ref>-auth-token`, possibly chunked `.0`/`.1`), so CSS can show an
 * account placeholder instead of "Sign in" for likely-signed-in visitors.
 * Signed-out visitors see the same header as before. The cookie only decides
 * which placeholder to paint; `useNavAccount` decides what replaces it.
 */
export const NAV_SESSION_FLAG_SCRIPT = `(function(){try{if(/(?:^|;\\s*)sb-[^=;]+-auth-token/.test(document.cookie)){document.getElementById(${JSON.stringify(
    NAV_SESSION_WRAPPER_ID,
)}).setAttribute('data-session','')}}catch(e){}})();`;
