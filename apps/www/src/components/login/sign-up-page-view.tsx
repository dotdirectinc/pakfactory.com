import {AuthSplitLayout} from '@/components/login/auth-split-layout';
import {SignUpForm} from '@/components/login/sign-up-form';

export function SignUpPageView() {
    return (
        <AuthSplitLayout>
            <SignUpForm />
        </AuthSplitLayout>
    );
}
