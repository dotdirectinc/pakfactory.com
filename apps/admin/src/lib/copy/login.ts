/**
 * Admin sign-in is Google-only, so this no longer satisfies the shared
 * `LoginCopy` shape — the email, password and forgot-password strings it
 * requires have nothing to render.
 */
export const ADMIN_LOGIN_COPY = {
  title: "PakFactory Admin",
  subtitle: "Sign in to your account",
  continueWithGoogle: "Continue with Google",
  accessNote:
    "Admin access is granted per account. If your PakFactory Google account is not recognised, contact your manager.",
  testimonialQuote:
    "Everything your team needs to move a buyer request forward — context, specs, and clear next steps, without digging through email.",
  testimonialAttribution: "Built for the PakFactory team",
};

export const ADMIN_LOGIN_ERRORS: Record<string, string> = {
  not_internal:
    "This account does not have admin access. Contact your manager if you need access.",
  link_invalid: "That sign-in link was not valid. Try again.",
  link_expired: "That sign-in link has already been used or has expired. Try again.",
  oauth_cancelled: "Google sign-in was cancelled. Try again when you are ready.",
  oauth_failed: "Google sign-in didn't complete. Please try again.",
  supabase_not_configured:
    "Supabase is not configured locally. Run `pnpm env:staging` from the repo root, or set ADMIN_DEV_BYPASS=true in apps/admin/.env.local.",
};
