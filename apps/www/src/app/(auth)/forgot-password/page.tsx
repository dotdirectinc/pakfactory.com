import type {Metadata} from 'next';
import {ForgotPasswordPageView} from '@/components/login/forgot-password-page-view';
import {robotsDirectiveToMetadata} from '@/lib/seo';

export const metadata: Metadata = {
    title: 'Forgot password',
    robots: robotsDirectiveToMetadata({index: false, follow: false}),
};

export default function ForgotPasswordPage() {
    return <ForgotPasswordPageView />;
}
