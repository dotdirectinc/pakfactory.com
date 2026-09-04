import { createBrowserClient } from "@supabase/ssr";

// Cookie scoping — and why no `domain` is set — is documented in ./server.ts.

/**
 * Supabase client for Client Components.
 *
 * The two env references are written as literal `process.env.NEXT_PUBLIC_*`
 * member expressions on purpose. Next inlines these at build time by matching the
 * source text, so a computed lookup (`process.env[key]`) is NOT replaced and
 * arrives as `undefined` in the browser bundle — silently, with no build error.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
