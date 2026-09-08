"use server";

import { redirect } from "next/navigation";
import { createClient } from "@pakfactory/supabase/server";
import { safeNext } from "@pakfactory/supabase/session";
import { getInternalAccountAdapter } from "@/lib/adapters";
import { isAdminDevBypassEnabled } from "@/lib/auth/dev-bypass";
import { isAdminPasswordLoginEnabled } from "@/lib/auth/password-login";

export interface ActionState {
  error?: string;
}

const emailOf = (form: FormData) =>
  String(form.get("email") ?? "")
    .trim()
    .toLowerCase();

/**
 * Email + password sign-in — reachable ONLY when `ADMIN_LOGIN=true`.
 *
 * 🔴 The flag is checked here, first, and not only where the form renders. A
 * server action is a POST endpoint that exists as soon as it is defined, so a
 * hidden form is not a disabled path — a caller who kept the action id from a
 * build where the flag was on would otherwise still be able to sign in.
 *
 * 🔴 The membership check below is the reason a password sign-in cannot admit a
 * non-staff account: Supabase auth will happily accept the credentials of any
 * user in the project, including a customer of the www app, which shares the
 * same Supabase auth. Without the `internal_user` lookup this action would hand
 * a buyer an admin session. Sign-out happens BEFORE returning, so no admin
 * cookie survives the refusal — the same property `/auth/callback` maintains for
 * the OAuth path.
 *
 * Unlike the callback this does NOT check the email domain. That is deliberate
 * and matches the behaviour this action had before it was removed: the domain is
 * a hint for the Google picker, the `internal_user` row is the gate, and a
 * fallback path that refused a provisioned account for its domain would defeat
 * the point of having a fallback.
 */
export async function signInInternal(
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  if (!isAdminPasswordLoginEnabled()) {
    return { error: "Password sign-in is disabled. Continue with Google." };
  }

  const email = emailOf(form);
  const password = String(form.get("password") ?? "");

  if (!email || !password) {
    return { error: "Enter your email and password." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: "Email or password is incorrect." };
  }

  const account = await getInternalAccountAdapter().getByEmail(email);
  if (!account) {
    await supabase.auth.signOut();
    return {
      error:
        "This account does not have admin access. Contact your manager if you need access.",
    };
  }

  redirect(safeNext(String(form.get("next") ?? "") || undefined, "/"));
}

export async function signOutInternal(): Promise<void> {
  if (isAdminDevBypassEnabled()) {
    redirect("/");
  }

  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
