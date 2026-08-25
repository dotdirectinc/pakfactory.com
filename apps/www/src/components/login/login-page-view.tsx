import {AuthSplitLayout} from '@/components/login/auth-split-layout';
import {LoginForm} from '@/components/login/login-form';

export function LoginPageView() {
    return (
        <AuthSplitLayout>
            <LoginForm />
        </AuthSplitLayout>
    );
}
