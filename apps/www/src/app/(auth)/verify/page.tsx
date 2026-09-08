import type {Metadata} from 'next';
import {robotsDirectiveToMetadata} from '@/lib/seo';
import {WWW_ROUTES} from '@/lib/www-routes';
import {AuthCard} from '@/components/auth/auth-card';
import {AuthField} from '@/components/auth/auth-field';
import {AuthForm} from '@/components/auth/auth-form';
import Link from 'next/link';
import {resendCode, verifyEmail} from '@/lib/auth/actions';
import {VERIFY_COPY} from '@/lib/copy/verify';

export const metadata: Metadata = {
    title: VERIFY_COPY.title,
    robots: robotsDirectiveToMetadata({index: false, follow: false}),
};

/**
 * The address arrives in the query string rather than a session, because at this
 * point there is no session — the account exists but is unconfirmed. It is not a
 * secret and not a credential: knowing it proves nothing, and the code is what
 * actually authorises anything.
 *
 * This screen is also where sign-up sends someone whose address ALREADY has a
 * confirmed account, because the two cases must look identical (see VERIFY_COPY).
 * For that buyer no code is coming and "Send a new code" cannot produce one, so
 * the footer carries both ways out — sign in, or reset the password. Neither
 * link reveals whether the address has an account: they render for everyone.
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
            title={VERIFY_COPY.title}
            description={
                email ? VERIFY_COPY.sentTo(email) : VERIFY_COPY.sent
            }
            footer={
                <>
                    {VERIFY_COPY.haveAccount}{' '}
                    <Link href={WWW_ROUTES.login} className="underline">
                        {VERIFY_COPY.signIn}
                    </Link>
                    {VERIFY_COPY.separator}
                    <Link
                        href={WWW_ROUTES.forgotPassword}
                        className="underline"
                    >
                        {VERIFY_COPY.forgotPassword}
                    </Link>
                </>
            }
        >
            <AuthForm action={verifyEmail} submitLabel={VERIFY_COPY.confirm}>
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
                        label={VERIFY_COPY.emailLabel}
                        type="email"
                        autoComplete="username"
                    />
                )}
                <AuthField
                    name="token"
                    label={VERIFY_COPY.codeLabel}
                    autoComplete="one-time-code"
                    inputMode="numeric"
                    // Deliberately NOT capped at 6. Supabase's OTP length is a
                    // dashboard setting — this project issues EIGHT digits — and a
                    // maxLength of 6 silently truncated the pasted code, which
                    // Supabase then rejected as "expired". The input must not
                    // encode an assumption the dashboard owns.
                    hint={VERIFY_COPY.codeHint}
                />
            </AuthForm>

            {/* Separate form: resending must not submit the code field, and a
                nested form is invalid HTML. */}
            <AuthForm action={resendCode} submitLabel={VERIFY_COPY.resend}>
                {email ? (
                    <input type="hidden" name="email" value={email} />
                ) : (
                    <AuthField
                        name="email"
                        label={VERIFY_COPY.emailLabel}
                        type="email"
                        autoComplete="username"
                    />
                )}
            </AuthForm>
        </AuthCard>
    );
}
