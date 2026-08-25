/**
 * Supabase auth errors → messages a buyer can act on.
 *
 * Two rules shape this map:
 *
 * 1. NEVER confirm whether an email has an account. "Invalid login credentials"
 *    covers both a wrong password and an unknown address, and the reset flow
 *    always reports success. Distinguishing them turns the login form into an
 *    account-enumeration oracle — and since the email IS the username here, that
 *    is a list of our customers.
 *
 * 2. Say what to DO next. "Otp has expired" tells a buyer nothing; "that code has
 *    expired — request a new one" tells them the recovery path.
 */
export type AuthErrorKind =
  | "invalid_credentials"
  | "email_not_confirmed"
  | "code_invalid"
  | "code_expired"
  | "rate_limited"
  | "weak_password"
  | "already_registered"
  | "unknown";

export interface MappedAuthError {
  kind: AuthErrorKind;
  message: string;
}

/** Supabase surfaces these as loose strings, so match on both code and message. */
export function mapAuthError(err: unknown): MappedAuthError {
  const raw = err as { code?: string; message?: string; status?: number } | null;
  const code = (raw?.code ?? "").toLowerCase();
  const msg = (raw?.message ?? "").toLowerCase();
  const has = (...needles: string[]) => needles.some((n) => msg.includes(n) || code.includes(n));

  if (raw?.status === 429 || has("rate limit", "too many requests", "over_email_send_rate")) {
    return {
      kind: "rate_limited",
      message: "Too many attempts. Wait a minute and try again.",
    };
  }

  // Checked before invalid_credentials: Supabase returns this for a correct
  // password on an unverified account, and telling the buyer to reset their
  // password would send them down a path that cannot fix it.
  if (has("email not confirmed", "email_not_confirmed")) {
    return {
      kind: "email_not_confirmed",
      message: "Confirm your email first — check your inbox for the code we sent.",
    };
  }

  if (has("invalid login credentials", "invalid_credentials", "invalid_grant")) {
    return {
      kind: "invalid_credentials",
      message: "That email and password don't match. Check both and try again.",
    };
  }

  // Supabase returns ONE error for both cases — error_code `otp_expired` with
  // "Token has expired or is invalid" — for a wrong code as well as a stale one.
  // Claiming "expired" for a mistyped code sends the buyer to request a new code
  // when the one they hold is fine, so the message names both possibilities.
  if (has("expired", "otp_expired", "invalid otp", "otp_invalid", "invalid token")) {
    return {
      kind: "code_invalid",
      message:
        "That code is invalid or has expired. Check the digits, or request a new one.",
    };
  }

  if (has("password should be", "weak_password", "password is too")) {
    return {
      kind: "weak_password",
      message: raw?.message ?? "Choose a longer password.",
    };
  }

  // Surfaced by signUp when the address already exists. We do NOT show this —
  // see rule 1 — but it is mapped so callers can branch without string-matching.
  if (has("already registered", "user_already_exists", "email_exists")) {
    return { kind: "already_registered", message: "" };
  }

  return {
    kind: "unknown",
    message: "Something went wrong. Try again, or contact us if it persists.",
  };
}
