/**
 * Copy for the sign-up confirmation screen.
 *
 * `sentTo` / `sent` are deliberately CONDITIONAL — "if that address is new" —
 * rather than the flat assertion they replaced ("Enter the code we sent to …").
 *
 * Supabase does not error when someone signs up with an address that already has
 * a confirmed account: GoTrue returns a decoy user, sends no email, and
 * `signUp` reports success. So `actions.ts` redirects here for BOTH a new buyer
 * and an existing one, on purpose — the two must be indistinguishable or the
 * form becomes an account-enumeration oracle, and the email IS the username.
 *
 * The consequence is that this screen cannot know whether a code is coming. It
 * previously promised one either way, which stranded anyone who already had an
 * account: no code arrives, "Send a new code" is silently a no-op (`resend`
 * errors for a confirmed user and resendCode swallows everything but rate
 * limiting), and nothing on the page suggests signing in instead. Observed
 * 2026-09-08 on staging with an address registered through Google.
 *
 * The wording holds the ambiguity — identical for every address — while the
 * footer gives the stranded buyer somewhere to go.
 */
export const VERIFY_COPY = {
    title: 'Confirm your email',
    sentTo: (email: string) =>
        `If that address is new, we've sent a code to ${email}.`,
    sent: "If that address is new, we've sent you a code.",
    confirm: 'Confirm',
    resend: 'Send a new code',
    codeLabel: 'Code',
    codeHint: 'The code expires in one hour.',
    emailLabel: 'Email',
    haveAccount: 'Already have an account?',
    signIn: 'Sign in',
    separator: ' · ',
    forgotPassword: 'Forgot your password?',
} as const;
