export const SIGN_UP_COPY = {
    title: 'Get started',
    subtitle: 'Create a new account',
    signUp: 'Sign up',
    haveAccount: 'Have an account?',
    signIn: 'Sign in',
    /**
     * Shown only once the buyer edits an address that arrived prefilled from a
     * confirmation receipt.
     *
     * Editing is allowed on purpose. Disabling the field would look like a
     * control and be none: the claim keys on the VERIFIED session email, never
     * on this value, so a locked input protects nothing and blocks the honest
     * cases — a typo at submission, or wanting the request under a work
     * address. What it does cost is the link to the request, silently. Saying
     * so is the fix.
     */
    emailChangedWarning: (original: string) =>
        `Your request was submitted with ${original}. If you create your account with a different address we can't attach that request to it — sign up with ${original} instead to keep them linked.`,
} as const;
