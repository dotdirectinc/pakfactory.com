/**
 * Email + password sign-in is OFF unless `ADMIN_LOGIN=true`.
 *
 * Google is the sign-in path (decided 2026-09-04). The password form survives
 * behind this flag as a deliberate fallback — for a machine that cannot complete
 * a Google round trip, or an account that has to get in while OAuth is broken —
 * not as a second everyday option.
 *
 * ⚠️ Read on the SERVER only, and passed down as a prop. Not `NEXT_PUBLIC_`, so
 * the flag is a deployment decision rather than something baked into a bundle,
 * and flipping it takes a redeploy of the server, not a rebuild of the client.
 *
 * 🔴 This gates the SERVER ACTION as well as the form. `signInInternal` is a
 * POST endpoint whether or not a form renders; not rendering the form hides the
 * path, it does not close it.
 */
export function isAdminPasswordLoginEnabled(): boolean {
  return process.env.ADMIN_LOGIN === "true";
}
