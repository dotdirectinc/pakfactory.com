import {policyHref} from '@/lib/www-routes';

export const LOGIN_COPY = {
    title: 'Welcome back',
    subtitle: 'Sign in to your account',
    continueWithGoogle: 'Continue with Google',
    /** Inline badge on the disabled Google button — OAuth is out of scope for PROD-1426. */
    googleComingSoon: 'Coming soon',
    or: 'or',
    emailLabel: 'Email',
    emailPlaceholder: 'you@example.com',
    passwordLabel: 'Password',
    forgotPassword: 'Forgot password?',
    signIn: 'Sign in',
    /** Shown while the sign-in request is in flight (PROD-1426). */
    signingIn: 'Signing in…',
    showPassword: 'Show password',
    hidePassword: 'Hide password',
    noAccount: "Don't have an account?",
    signUp: 'Sign up',
    emailMagicLinkInstead: 'Email me a link instead',
    signInWithPassword: 'Sign in with password',
    emailMagicLink: 'Email me a link',
    legalPrefix: 'By continuing, you agree to PakFactory’s',
    termsOfService: 'Terms of Service',
    privacyPolicy: 'Privacy Policy',
    legalSuffix: ', and to receive periodic emails with updates.',
    termsHref: policyHref('terms-of-service'),
    privacyHref: policyHref('privacy-policy'),
    testimonialQuote:
        'PakFactory made custom packaging feel straightforward — clear quotes, solid specs, and a team that actually understood our brand.',
    testimonialAttribution: 'Packaging buyer',
} as const;
