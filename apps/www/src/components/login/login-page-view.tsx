import {AuthSplitLayout} from '@/components/login/auth-split-layout';
import {LoginForm} from '@/components/login/login-form';

export function LoginPageView({next, notice}: {next?: string; notice?: string}) {
    return (
        <AuthSplitLayout>
            {notice ? (
                <p
                    role="alert"
                    className="w-full max-w-sm text-sm text-destructive"
                >
                    {notice}
                </p>
            ) : null}
            <LoginForm next={next} />
        </AuthSplitLayout>
    );
}
