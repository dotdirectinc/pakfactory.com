import {redirect} from 'next/navigation';
import type {Metadata} from 'next';
import {SignUpPageView} from '@/components/login/sign-up-page-view';
import {getUser} from '@pakfactory/supabase/session';
import {robotsDirectiveToMetadata} from '@/lib/seo';

export const metadata: Metadata = {
    title: 'Sign up',
    robots: robotsDirectiveToMetadata({index: false, follow: false}),
};

export default async function SignUpPage() {
    if (await getUser()) {
        redirect('/account');
    }

    return <SignUpPageView />;
}
