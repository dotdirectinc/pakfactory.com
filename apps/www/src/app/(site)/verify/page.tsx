import type {Metadata} from 'next';
import {robotsDirectiveToMetadata} from '@/lib/seo';
import {AuthCard} from '@/components/auth/auth-card';
import {AuthField} from '@/components/auth/auth-field';
import {AuthForm} from '@/components/auth/auth-form';
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
                <input type="hidden" name="email" value={email} />
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
                <input type="hidden" name="email" value={email} />
            </AuthForm>
        </AuthCard>
    );
}
