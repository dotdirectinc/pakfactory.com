import type { LoginCopy } from "@pakfactory/auth-ui/login-copy";

/**
 * Satisfies the shared `LoginCopy` shape because the password form can still
 * render — behind `ADMIN_LOGIN=true`. With the flag off, only `title`,
 * `subtitle`, `continueWithGoogle` and `accessNote` are used; the email and
 * password strings have nothing to render but stay so that flipping the flag is
 * a deployment change and not a code change.
 *
 * There is deliberately no `forgotPassword`/`signUp` HREF anywhere in admin —
 * `lib/www-links.ts` was deleted with the cross-link that put admin's login into
 * the CUSTOMER app, and it is not coming back with the form. `LoginForm` renders
 * those links only when given hrefs, so it renders none.
 */
export const ADMIN_LOGIN_COPY: LoginCopy & {
  accessNote: string;
  testimonialQuote: string;
  testimonialAttribution: string;
} = {
  title: "PakFactory Admin",
  subtitle: "Sign in to your account",
  continueWithGoogle: "Continue with Google",
  or: "or",
  emailLabel: "Email",
  emailPlaceholder: "you@example.com",
  passwordLabel: "Password",
  forgotPassword: "Forgot password?",
  signIn: "Sign in",
  signingIn: "Signing in…",
  showPassword: "Show password",
  hidePassword: "Hide password",
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
