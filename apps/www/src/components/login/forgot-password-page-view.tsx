import {AuthSplitLayout} from '@/components/login/auth-split-layout';
import {ForgotPasswordForm} from '@/components/login/forgot-password-form';

export function ForgotPasswordPageView() {
    return (
        <AuthSplitLayout>
            <ForgotPasswordForm />
        </AuthSplitLayout>
    );
}
