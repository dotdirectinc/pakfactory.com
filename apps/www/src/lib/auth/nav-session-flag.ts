/**
 * Pre-paint session flag for the `(site)` header (PROD-2754). Plain module (no
 * `'use client'`) so the server layout gets the real strings, not client
 * references. See `use-nav-account.ts` for the browser-side account state.
 */

/**
 * Supabase auth cookie (`sb-<ref>-auth-token`, possibly chunked `.0`/`.1`). Shared by
 * the pre-paint script and {@link hasAuthCookie} so the two can't drift.
 */
const AUTH_COOKIE_PATTERN = '(?:^|;\\s*)sb-[^=;]+-auth-token';

/**
 * Browser-only: does this visitor carry a Supabase auth cookie? Without one they
 * are signed out, so the header skips loading the Supabase client (PROD-2754).
 */
export function hasAuthCookie(): boolean {
    return new RegExp(AUTH_COOKIE_PATTERN).test(document.cookie);
}

/** Wrapper id the pre-paint flag script marks (see {@link NAV_SESSION_FLAG_SCRIPT}). */
export const NAV_SESSION_WRAPPER_ID = 'pf-nav-session';

/**
 * Inline script in the root layout (outside `RequestRoot`) so a client parent
 * re-render cannot drop it (React 19). Marks `#pf-nav-session` when a Supabase
 * auth cookie is present so CSS can show an account placeholder instead of
 * "Sign in". Waits for the wrapper if the site layout streams in after this
 * script. The cookie only decides which placeholder to paint; `useNavAccount`
 * decides what replaces it.
 */
export const NAV_SESSION_FLAG_SCRIPT = `(function(){try{var re=new RegExp(${JSON.stringify(
    AUTH_COOKIE_PATTERN,
)});if(!re.test(document.cookie))return;var id=${JSON.stringify(
    NAV_SESSION_WRAPPER_ID,
)};function mark(el){if(el)el.setAttribute('data-session','')}var el=document.getElementById(id);if(el){mark(el);return}var obs=new MutationObserver(function(){var n=document.getElementById(id);if(n){mark(n);obs.disconnect()}});obs.observe(document.documentElement,{childList:true,subtree:true})}catch(e){}})();`;