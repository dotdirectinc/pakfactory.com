"use server";

import { redirect } from "next/navigation";
import { createClient } from "../supabase/server";
import { mapAuthError } from "./errors";
import { safeNext } from "./session";

/**
 * Auth server actions (PROD-1426).
 *
 * Server Actions rather than client-side calls: they run where cookies can be
 * written, so the session is established in the same request that verifies the
 * credential. A browser-side sign-in would set the session client-side and leave
 * the server render of the next page unaware of it until a refresh.
 *
 * Every action returns `{ error }` instead of throwing. A thrown error in a
 * Server Action reaches the client as a generic digest with the message stripped
 * in production — the buyer would see "an error occurred" for a simple typo.
 */
export interface ActionState {
  error?: string;
  /** Set when the next step needs the address the buyer just used. */
  email?: string;
}

const emailOf = (form: FormData) => String(form.get("email") ?? "").trim().toLowerCase();

export async function signUp(_prev: ActionState, form: FormData): Promise<ActionState> {
  const email = emailOf(form);
  const password = String(form.get("password") ?? "");

  if (!email || !password) return { error: "Enter your email and a password.", email };

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({ email, password });

  if (error) {
    const mapped = mapAuthError(error);
    // An existing address must NOT be distinguishable from a new one — the reply
    // would confirm who has an account, and the email IS the username here. Send
    // both cases to the same screen; a real owner gets a code, anyone probing
    // learns nothing.
    if (mapped.kind === "already_registered") redirect(`/verify?email=${encodeURIComponent(email)}`);
    return { error: mapped.message, email };
  }

  redirect(`/verify?email=${encodeURIComponent(email)}`);
}

export async function verifyEmail(_prev: ActionState, form: FormData): Promise<ActionState> {
  const email = emailOf(form);
  const token = String(form.get("token") ?? "").replace(/\s/g, "");

  if (!token) return { error: "Enter the code from your email.", email };

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ email, token, type: "signup" });

  if (error) return { error: mapAuthError(error).message, email };

  // verifyOtp establishes the session, so the buyer lands signed in.
  redirect("/account");
}

export async function resendCode(_prev: ActionState, form: FormData): Promise<ActionState> {
  const email = emailOf(form);
  if (!email) return { error: "Enter your email first." };

  const supabase = await createClient();
  const { error } = await supabase.auth.resend({ type: "signup", email });

  // Rate limiting is the one failure worth surfacing — it tells the buyer to
  // wait rather than keep clicking. Everything else stays silent so a resend
  // cannot be used to test whether an address is registered.
  if (error) {
    const mapped = mapAuthError(error);
    if (mapped.kind === "rate_limited") return { error: mapped.message, email };
  }
  return { email };
}

export async function signIn(_prev: ActionState, form: FormData): Promise<ActionState> {
  const email = emailOf(form);
  const password = String(form.get("password") ?? "");

  if (!email || !password) return { error: "Enter your email and password.", email };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    const mapped = mapAuthError(error);
    // Unverified accounts get routed to the code screen rather than a dead end:
    // the password was right, there is simply a step outstanding.
    if (mapped.kind === "email_not_confirmed") {
      redirect(`/verify?email=${encodeURIComponent(email)}`);
    }
    return { error: mapped.message, email };
  }

  // Resume wherever the gate interrupted them, not a fixed landing page.
  redirect(safeNext(String(form.get("next") ?? "") || undefined));
}

export async function requestPasswordReset(
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  const email = emailOf(form);
  if (!email) return { error: "Enter your email.", email };

  const supabase = await createClient();
  const {error} = await supabase.auth.resetPasswordForEmail(email);

  // The BUYER is told the same thing either way — reporting "no account with that
  // email" would make this form an account-enumeration oracle. But the failure is
  // logged server-side, because silence in both directions is how a genuinely
  // broken sender (rate limit hit, SMTP misconfigured, template rejected) becomes
  // indistinguishable from working. That cost real debugging time on 2026-08-25:
  // the only way to tell whether an email had gone out was querying
  // recovery_sent_at through the admin API.
  if (error) {
    console.error("[auth] resetPasswordForEmail failed", {
      code: (error as {code?: string}).code,
      status: (error as {status?: number}).status,
      message: error.message,
    });
  }

  redirect(`/reset-password?email=${encodeURIComponent(email)}`);
}

export async function resetPassword(_prev: ActionState, form: FormData): Promise<ActionState> {
  const email = emailOf(form);
  const token = String(form.get("token") ?? "").replace(/\s/g, "");
  const password = String(form.get("password") ?? "");

  if (!token || !password) return { error: "Enter the code and a new password.", email };

  const supabase = await createClient();

  // Two steps, in this order: the code exchanges for a session, and only a
  // session can change the password. Skipping the verify would mean anyone could
  // reset any account by naming its address.
  const verified = await supabase.auth.verifyOtp({ email, token, type: "recovery" });
  if (verified.error) return { error: mapAuthError(verified.error).message, email };

  const updated = await supabase.auth.updateUser({ password });
  if (updated.error) return { error: mapAuthError(updated.error).message, email };

  redirect("/account");
}

/**
 * Send a reset code to the SIGNED-IN buyer and take them to the code screen.
 *
 * The address comes from the session, never from a form field. A hidden input
 * would be tamperable, turning an authenticated page into a way to fire reset
 * emails at arbitrary addresses — our own sender, our own reputation.
 *
 * Note this is reset-by-email, not change-password. A signed-in buyer would
 * normally change their password by supplying the current one, with no email
 * round trip; that belongs with the account portal, which PROD-1426 scopes out.
 * This exposes the existing reset flow so it can be exercised without signing
 * out first.
 */
export async function sendPasswordResetForCurrentUser(): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) redirect("/login");

  const { error } = await supabase.auth.resetPasswordForEmail(user.email);
  if (error) {
    console.error("[auth] resetPasswordForEmail (signed-in) failed", {
      code: (error as { code?: string }).code,
      status: (error as { status?: number }).status,
      message: error.message,
    });
  }

  redirect(`/reset-password?email=${encodeURIComponent(user.email)}`);
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
