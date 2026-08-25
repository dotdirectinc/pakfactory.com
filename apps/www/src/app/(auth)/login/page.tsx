import {redirect} from 'next/navigation';
import type {Metadata} from 'next';
import {LoginPageView} from '@/components/login/login-page-view';
import {getUser, safeNext} from '@/lib/auth/session';
import {robotsDirectiveToMetadata} from '@/lib/seo';

export const metadata: Metadata = {
    title: 'Login',
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
    const destination = safeNext(next);

    // Showing a sign-in form to someone already signed in is a dead end that
    // invites them to re-enter credentials for no reason.
    if (await getUser()) {
        redirect(destination);
    }

    return (
        <LoginPageView
            next={destination}
            notice={error ? CALLBACK_ERRORS[error] : undefined}
        />
    );
}
