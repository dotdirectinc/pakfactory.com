import type {Metadata} from 'next';
import {robotsDirectiveToMetadata} from '@/lib/seo';
import {WWW_ROUTES} from '@/lib/www-routes';
import {AuthCard} from '@/components/auth/auth-card';
import {AuthField} from '@/components/auth/auth-field';
import {AuthForm} from '@/components/auth/auth-form';
import Link from 'next/link';
import {resendCode, verifyEmail} from '@/lib/auth/actions';

export const metadata: Metadata = {
    title: 'Confirm your email',
    robots: robotsDirectiveToMetadata({index: false, follow: false}),
};

/**
 * The address arrives in the query string rather than a session, because at this
 * point there is no session — the account exists but is unconfirmed. It is not a
 * secret and not a credential: knowing it proves nothing, and the code is what
 * actually authorises anything.
 *
 * searchParams is a Promise in Next 16.
 */
export default async function VerifyPage({
    searchParams,
}: {
    searchParams: Promise<{email?: string}>;
}) {
    const {email = ''} = await searchParams;

    return (
        <AuthCard
            title="Confirm your email"
            description={
                email
                    ? `Enter the code we sent to ${email}.`
                    : 'Enter the code we emailed you.'
            }
        >
            <AuthForm action={verifyEmail} submitLabel="Confirm">
                {/*
                  Without ?email= this page used to be a dead end: the hidden field
                  was empty, so both buttons failed with "Enter your email first"
                  and there was nothing to type into. Landing here directly is not
                  exotic — it happens on a bookmark, a reload after the query is
                  stripped, or a link shared between devices.
                */}
                {email ? (
                    <input type="hidden" name="email" value={email} />
                ) : (
                    <AuthField
                        name="email"
                        label="Email"
                        type="email"
                        autoComplete="username"
                    />
                )}
                <AuthField
                    name="token"
                    label="Code"
                    autoComplete="one-time-code"
                    inputMode="numeric"
                    // Deliberately NOT capped at 6. Supabase's OTP length is a
                    // dashboard setting — this project issues EIGHT digits — and a
                    // maxLength of 6 silently truncated the pasted code, which
                    // Supabase then rejected as "expired". The input must not
                    // encode an assumption the dashboard owns.
                    hint="The code expires in one hour."
                />
            </AuthForm>

            {/* Separate form: resending must not submit the code field, and a
                nested form is invalid HTML. */}
            <AuthForm action={resendCode} submitLabel="Send a new code">
                {email ? (
                    <input type="hidden" name="email" value={email} />
                ) : (
                    <AuthField
                        name="email"
                        label="Email"
                        type="email"
                        autoComplete="username"
                    />
                )}
            </AuthForm>

            <p className="text-muted-foreground text-sm">
                Already confirmed?{' '}
                <Link href={WWW_ROUTES.login} className="underline">
                    Sign in
                </Link>
            </p>
        </AuthCard>
    );
}
