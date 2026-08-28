import { NextResponse } from "next/server";
import { createClient } from "@pakfactory/supabase/server";

const ALLOWED_ERRORS = new Set(["not_internal"]);

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const error = searchParams.get("error");
  const loginError =
    error && ALLOWED_ERRORS.has(error) ? error : undefined;

  const supabase = await createClient();
  await supabase.auth.signOut();

  const loginUrl = loginError
    ? `${origin}/login?error=${loginError}`
    : `${origin}/login`;

  return NextResponse.redirect(loginUrl);
}
