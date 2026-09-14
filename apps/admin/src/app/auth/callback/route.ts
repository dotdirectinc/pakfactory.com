import { NextResponse } from "next/server";
import { createClient } from "@pakfactory/supabase/server";
import { safeNext } from "@pakfactory/supabase/session";
import { getInternalAccountAdapter } from "@/lib/adapters";

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
 * ONE check: an enabled `internal_user` row (PROD-2512 / ADR-0016 D3). That row
 * is what a person provisions, and it is the only thing that makes someone staff.
 *
 * The email-domain check that used to sit beside it is gone, deliberately. Staff
 * hold addresses on more than one domain (`dotdirect.ca` and `pakfactory.com`),
 * and a domain test either refused real colleagues or had to grow a list that
 * would drift from the rows that actually grant access. A domain was only ever
 * "could be staff"; the row is "is staff", so the row is the gate.
 *
 * Every Google account in the project can reach this callback — customers of the
 * www app share the same Supabase auth (ADR-0016 D1). That is safe because a
 * session without a row is signed out here, before any admin cookie leaves.
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

  // One generic message for every refusal: saying "no account for this address"
  // would confirm which addresses are staff. A real colleague is told to contact
  // their manager either way.
  const allowed =
    email.length > 0 &&
    Boolean(await getInternalAccountAdapter().getByEmail(email));

  if (!allowed) {
    // Sign out BEFORE redirecting, so no admin cookie survives the round trip.
    await supabase.auth.signOut();
    return NextResponse.redirect(`${origin}/login?error=not_internal`);
  }

  return NextResponse.redirect(`${origin}${next}`);
}
