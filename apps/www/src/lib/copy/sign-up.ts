export const SIGN_UP_COPY = {
    title: 'Get started',
    subtitle: 'Create a new account',
    signUp: 'Sign up',
    haveAccount: 'Have an account?',
    signIn: 'Sign in',
    /** Under the locked field: says why it cannot be typed in. */
    emailLockedHint: 'This is the address your request was sent to.',
    useDifferentEmail: 'Use a different address',
    /**
     * Shown once the buyer deliberately unlocks the field.
     *
     * The lock is NOT a security control — the claim keys on the verified
     * session email, so this value grants nothing either way. It is here
     * because this link only ever arrives inside a receipt that was delivered
     * to that address, so it is provably the buyer's; changing it silently
     * costs them the request, and the failure is invisible until they land on
     * an empty Requests page with no idea why.
     */
    emailUnlockedWarning: (original: string) =>
        `An account under a different address won't be linked to the request you just submitted. Sign up with ${original} to keep them together.`,
} as const;
