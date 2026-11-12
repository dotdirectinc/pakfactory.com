import type {Metadata} from 'next';
import Link from 'next/link';
import {AuthCard} from '@/components/auth/auth-card';
import {ResendCodeForm} from '@/components/auth/resend-code-form';
import {VerifyEmailForm} from '@/components/auth/verify-email-form';
import {VERIFY_COPY} from '@/lib/copy/verify';
import {robotsDirectiveToMetadata} from '@/lib/seo';
import {WWW_ROUTES} from '@/lib/www-routes';

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
            description={email ? VERIFY_COPY.sentTo(email) : VERIFY_COPY.sent}
            footer={
                <>
                    {VERIFY_COPY.haveAccount}{' '}
                    <Link href={WWW_ROUTES.login} className="underline">
                        {VERIFY_COPY.signIn}
                    </Link>
                    {VERIFY_COPY.separator}
                    <Link href={WWW_ROUTES.forgotPassword} className="underline">
                        {VERIFY_COPY.forgotPassword}
                    </Link>
                </>
            }
        >
            <VerifyEmailForm email={email} />
            <ResendCodeForm email={email} />
        </AuthCard>
    );
}
