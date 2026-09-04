import { NextResponse } from "next/server";
import { createClient } from "@pakfactory/supabase/server";
import { safeNext } from "@pakfactory/supabase/session";
import { getInternalAccountAdapter } from "@/lib/adapters";
import { INTERNAL_EMAIL_DOMAIN } from "@/lib/auth/internal-domain";

/**
 * OAuth return, and the ONLY place an admin session is established.
 *
 * 🔴 The membership check lives HERE, not on the login page.
 *
 * It used to exchange the code, redirect, and leave `/login` to notice that the
 * caller had no `internal_user` row and bounce them to sign-out. That works, but
 * it establishes a real admin session first and only revokes it on the next
 * request — a window in which any Google account holds admin cookies. The
 * password path never had that gap: `signInInternal` checks membership and signs
 * out before returning. This closes it for OAuth.
 *
 * Two checks, and both are needed:
 *
 *   DOMAIN     — `hd` on the authorize request only asks Google to show company
 *                accounts. It is a hint the client sends, so it is not a control;
 *                the same callback answers a hand-crafted request without it.
 *   MEMBERSHIP — an enabled `internal_user` row. This is the real gate, and it is
 *                what Richard provisions per person (decided 2026-09-04).
 *
 * A colleague at the right domain with no row is refused, which is the point:
 * the domain says "could be staff", the row says "is staff".
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeNext(searchParams.get("next") ?? undefined, "/");

  const oauthError = searchParams.get("error");
  if (oauthError) {
    const kind =
      oauthError === "access_denied" ? "oauth_cancelled" : "oauth_failed";
    return NextResponse.redirect(`${origin}/login?error=${kind}`);
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=link_invalid`);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(`${origin}/login?error=link_expired`);
  }

  const email = data.user?.email?.trim().toLowerCase() ?? "";

  // Refused for either reason with the SAME message. Telling a stranger "right
  // domain, no account" confirms which addresses are staff; telling them "wrong
  // domain" confirms the domain. Neither is worth the marginal clarity, and a
  // real colleague is told to contact their manager either way.
  const allowed =
    email.endsWith(`@${INTERNAL_EMAIL_DOMAIN}`) &&
    Boolean(await getInternalAccountAdapter().getByEmail(email));

  if (!allowed) {
    // Sign out BEFORE redirecting, so no admin cookie survives the round trip.
    await supabase.auth.signOut();
    return NextResponse.redirect(`${origin}/login?error=not_internal`);
  }

  return NextResponse.redirect(`${origin}${next}`);
}
