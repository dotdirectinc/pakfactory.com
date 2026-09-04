"use server";

import { redirect } from "next/navigation";
import { createClient } from "@pakfactory/supabase/server";
import { isAdminDevBypassEnabled } from "@/lib/auth/dev-bypass";

/**
 * 🔴 `signInInternal` (email + password) was removed on 2026-09-04. Admin
 * sign-in is Google-only; the membership check it performed now lives in
 * `/auth/callback`, which is the single place a session is established.
 *
 * If a password path is ever reinstated, it must keep that check — it was the
 * only reason a password sign-in could not admit a non-staff account.
 */
export async function signOutInternal(): Promise<void> {
  if (isAdminDevBypassEnabled()) {
    redirect("/");
  }

  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
