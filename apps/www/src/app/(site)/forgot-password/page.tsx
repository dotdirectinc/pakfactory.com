import type {Metadata} from 'next';
import {robotsDirectiveToMetadata} from '@/lib/seo';
import {AuthCard} from '@/components/auth/auth-card';
import {AuthField} from '@/components/auth/auth-field';
import {AuthForm} from '@/components/auth/auth-form';
import {requestPasswordReset} from '@/lib/auth/actions';

export const metadata: Metadata = {
    title: 'Reset your password',
    robots: robotsDirectiveToMetadata({index: false, follow: false}),
};

export default function ForgotPasswordPage() {
    return (
        <AuthCard
            title="Reset your password"
            // Phrased as a conditional on purpose: the next screen appears
            // whether or not the address has an account, so this copy must not
            // promise an email that may never arrive.
            description="If that address has an account, we'll send a reset code to it."
        >
            <AuthForm action={requestPasswordReset} submitLabel="Send reset code">
                <AuthField name="email" label="Email" type="email" autoComplete="username" />
            </AuthForm>
        </AuthCard>
    );
}
