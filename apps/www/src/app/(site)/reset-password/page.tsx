import type {Metadata} from 'next';
import {robotsDirectiveToMetadata} from '@/lib/seo';
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
            description="Enter the code we emailed you, then your new password."
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
