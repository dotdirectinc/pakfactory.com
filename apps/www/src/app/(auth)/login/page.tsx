import type {Metadata} from 'next';
import {LoginPageView} from '@/components/login/login-page-view';
import {robotsDirectiveToMetadata} from '@/lib/seo';

export const metadata: Metadata = {
    title: 'Login',
    robots: robotsDirectiveToMetadata({index: false, follow: false}),
};

export default function LoginPage() {
    return <LoginPageView />;
}
