import { NextResponse } from "next/server";
import { createClient } from "@pakfactory/supabase/server";
import { safeNext } from "@pakfactory/supabase/session";

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
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(`${origin}/login?error=link_expired`);
  }

  return NextResponse.redirect(`${origin}${next}`);
}
