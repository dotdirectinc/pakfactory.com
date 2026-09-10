import {redirect} from 'next/navigation';
import type {Metadata} from 'next';
import {z} from 'zod';
import {SignUpPageView} from '@/components/login/sign-up-page-view';
import {getUser} from '@pakfactory/supabase/session';
import {robotsDirectiveToMetadata} from '@/lib/seo';

export const metadata: Metadata = {
    title: 'Sign up',
    robots: robotsDirectiveToMetadata({index: false, follow: false}),
};

/**
 * 🔴 `?email=` is a PREFILL, never a credential.
 *
 * It arrives from the confirmation receipt's "Create your account" button so a
 * guest does not retype the address their request is filed under. Anyone can
 * type this URL with anyone's address, so nothing may be granted on the
 * strength of it: the guest claim reads the verified session email instead
 * (`claimGuestRequests` in lib/auth/actions.ts). Parsed here only so a
 * malformed parameter cannot land in the field.
 *
 * searchParams is a Promise in Next 16.
 */
const prefillEmailSchema = z.string().trim().toLowerCase().email();

export default async function SignUpPage({
    searchParams,
}: {
    searchParams: Promise<{email?: string}>;
}) {
    if (await getUser()) {
        redirect('/account');
    }

    const {email} = await searchParams;
    const prefill = prefillEmailSchema.safeParse(email ?? '');

    return (
        <SignUpPageView
            prefillEmail={prefill.success ? prefill.data : undefined}
        />
    );
}
