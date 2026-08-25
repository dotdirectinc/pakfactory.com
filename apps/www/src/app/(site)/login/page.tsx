import Link from 'next/link';
import type {Metadata} from 'next';
import {robotsDirectiveToMetadata} from '@/lib/seo';
import {AuthCard} from '@/components/auth/auth-card';
import {AuthField} from '@/components/auth/auth-field';
import {AuthForm} from '@/components/auth/auth-form';
import {signIn} from '@/lib/auth/actions';

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

export default function LoginPage() {
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
            <AuthForm action={signIn} submitLabel="Sign in">
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
