import Link from 'next/link';
import type {Metadata} from 'next';
import {robotsDirectiveToMetadata} from '@/lib/seo';
import {WWW_ROUTES} from '@/lib/www-routes';
import {AuthCard} from '@/components/auth/auth-card';
import {AuthField} from '@/components/auth/auth-field';
import {AuthForm} from '@/components/auth/auth-form';
import {resetPassword} from '@/lib/auth/actions';

export const metadata: Metadata = {
    title: 'Choose a new password',
    robots: robotsDirectiveToMetadata({index: false, follow: false}),
};

export default async function ResetPasswordPage({
    searchParams,
}: {
    searchParams: Promise<{email?: string}>;
}) {
    const {email = ''} = await searchParams;

    return (
        <AuthCard
            title="Choose a new password"
            /*
             * Conditional on purpose, and it must stay that way.
             *
             * /forgot-password deliberately does not reveal whether an address has
             * an account — the email IS the username here, so a form that confirms
             * existence is an oracle for our customer list, which for a B2B
             * manufacturer is commercially useful to a competitor.
             *
             * This page previously said "the code we emailed you", which asserted
             * as fact the very thing the previous screen refused to confirm. Anyone
             * entering an unregistered address was told a code had been sent and
             * then left waiting for it.
             *
             * Naming the address also lets a buyer spot their own typo, which is
             * the far more common reason no code arrives.
             */
            description={
                email
                    ? `If ${email} has an account, a code is on its way. Enter it below with your new password.`
                    : 'If that address has an account, a code is on its way. Enter it below with your new password.'
            }
            footer={
                <>
                    No code? Check the address on the{' '}
                    <Link href={WWW_ROUTES.forgotPassword} className="underline">
                        previous step
                    </Link>
                    , or{' '}
                    <Link href={WWW_ROUTES.signUp} className="underline">
                        create an account
                    </Link>
                    .
                </>
            }
        >
            <AuthForm action={resetPassword} submitLabel="Update password">
                <input type="hidden" name="email" value={email} />
                <AuthField
                    name="token"
                    label="Code"
                    autoComplete="one-time-code"
                    inputMode="numeric"
                    // Not capped — see the note in verify/page.tsx.
                />
                <AuthField
                    name="password"
                    label="New password"
                    type="password"
                    autoComplete="new-password"
                    hint="At least 8 characters."
                />
            </AuthForm>
        </AuthCard>
    );
}
