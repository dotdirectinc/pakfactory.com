import Link from 'next/link';
import type {Metadata} from 'next';
import {robotsDirectiveToMetadata} from '@/lib/seo';
import {AuthCard} from '@/components/auth/auth-card';
import {AuthField} from '@/components/auth/auth-field';
import {AuthForm} from '@/components/auth/auth-form';
import {redirect} from 'next/navigation';
import {signUp} from '@/lib/auth/actions';
import {getUser} from '@/lib/auth/session';

export const metadata: Metadata = {
    title: 'Create an account',
    robots: robotsDirectiveToMetadata({index: false, follow: false}),
};

export default async function SignupPage() {
    if (await getUser()) {
        redirect('/account');
    }

    return (
        <AuthCard
            title="Create an account"
            description="We'll email you a code to confirm the address."
            footer={
                <>
                    Already have an account?{' '}
                    <Link href="/login" className="underline">
                        Sign in
                    </Link>
                </>
            }
        >
            <AuthForm action={signUp} submitLabel="Create account">
                <AuthField name="email" label="Email" type="email" autoComplete="username" />
                <AuthField
                    name="password"
                    label="Password"
                    type="password"
                    autoComplete="new-password"
                    hint="At least 8 characters."
                />
            </AuthForm>
        </AuthCard>
    );
}
