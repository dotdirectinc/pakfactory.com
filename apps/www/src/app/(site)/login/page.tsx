import Link from 'next/link';
import type {Metadata} from 'next';
import {robotsDirectiveToMetadata} from '@/lib/seo';
import {AuthCard} from '@/components/auth/auth-card';
import {AuthField} from '@/components/auth/auth-field';
import {AuthForm} from '@/components/auth/auth-form';
import {redirect} from 'next/navigation';
import {signIn} from '@/lib/auth/actions';
import {getUser, safeNext} from '@/lib/auth/session';

/**
 * Every auth page sets robots explicitly rather than leaning on the root layout's
 * blanket noindex. That blanket exists only for the PROD-2207 origin lockdown and
 * is scheduled to be REMOVED at main-site launch — at which point /login would
 * quietly become indexable. Sign-in pages should never be in search results.
 */
export const metadata: Metadata = {
    title: 'Sign in',
    robots: robotsDirectiveToMetadata({index: false, follow: false}),
};

/** Messages for the callback handler's `?error=` values (see app/auth/callback). */
const CALLBACK_ERRORS: Record<string, string> = {
    link_invalid: 'That link was not valid. Sign in below, or request a new code.',
    link_expired:
        'That link has already been used or has expired. Sign in below, or request a new code.',
};

export default async function LoginPage({
    searchParams,
}: {
    searchParams: Promise<{error?: string; next?: string}>;
}) {
    const {error, next} = await searchParams;
    const notice = error ? CALLBACK_ERRORS[error] : undefined;
    const destination = safeNext(next);

    // Already signed in: showing a sign-in form to someone who is signed in is a
    // dead end that invites them to re-enter credentials for no reason.
    if (await getUser()) {
        redirect(destination);
    }

    return (
        <AuthCard
            title="Sign in"
            description="Use the email address you signed up with."
            footer={
                <>
                    New to PakFactory?{' '}
                    <Link href="/signup" className="underline">
                        Create an account
                    </Link>
                </>
            }
        >
            {notice ? (
                <p role="alert" className="text-destructive text-sm leading-relaxed">
                    {notice}
                </p>
            ) : null}

            <AuthForm action={signIn} submitLabel="Sign in">
                {/* Carries the gate's return-to through the POST, so signing in
                    resumes the journey rather than landing on /account. */}
                <input type="hidden" name="next" value={destination} />
                <AuthField name="email" label="Email" type="email" autoComplete="username" />
                <AuthField
                    name="password"
                    label="Password"
                    type="password"
                    autoComplete="current-password"
                />
                <Link href="/forgot-password" className="text-muted-foreground text-sm underline">
                    Forgot your password?
                </Link>
            </AuthForm>
        </AuthCard>
    );
}
