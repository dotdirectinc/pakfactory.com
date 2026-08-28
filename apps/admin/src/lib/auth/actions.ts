"use server";

import { redirect } from "next/navigation";
import { createClient } from "@pakfactory/supabase/server";
import { safeNext } from "@pakfactory/supabase/session";
import { getInternalAccountAdapter } from "@/lib/adapters";
import { isAdminDevBypassEnabled } from "@/lib/auth/dev-bypass";

export interface ActionState {
  error?: string;
}

const emailOf = (form: FormData) =>
  String(form.get("email") ?? "")
    .trim()
    .toLowerCase();

export async function signInInternal(
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
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
