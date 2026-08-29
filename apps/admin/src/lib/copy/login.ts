import type { LoginCopy } from "@pakfactory/auth-ui/login-copy";

export const ADMIN_LOGIN_COPY: LoginCopy & {
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
  testimonialQuote:
    "Everything your team needs to move a buyer request forward — context, specs, and clear next steps, without digging through email.",
  testimonialAttribution: "Built for the PakFactory team",
};

export const ADMIN_LOGIN_ERRORS: Record<string, string> = {
  not_internal:
    "This account does not have admin access. Contact your manager if you need access.",
  link_invalid:
    "That link was not valid. Sign in below, or request a new code.",
  link_expired:
    "That link has already been used or has expired. Sign in below, or request a new code.",
  oauth_cancelled:
    "Google sign-in was cancelled. You can sign in with your email instead.",
  oauth_failed:
    "Google sign-in didn't complete. Try again, or sign in with your email.",
  supabase_not_configured:
    "Supabase is not configured locally. Run `pnpm env:staging` from the repo root, or set ADMIN_DEV_BYPASS=true in apps/admin/.env.local.",
};
