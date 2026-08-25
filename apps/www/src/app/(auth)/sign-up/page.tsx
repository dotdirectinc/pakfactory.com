import type {Metadata} from 'next';
import {SignUpPageView} from '@/components/login/sign-up-page-view';
import {robotsDirectiveToMetadata} from '@/lib/seo';

export const metadata: Metadata = {
    title: 'Sign up',
    robots: robotsDirectiveToMetadata({index: false, follow: false}),
};

export default function SignUpPage() {
    return <SignUpPageView />;
}
