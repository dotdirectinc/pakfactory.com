'use client';

import {LoginForm as SharedLoginForm} from '@pakfactory/auth-ui/login-form';
import {LoginGoogleButton} from '@/components/login/login-google-button';
import {signIn} from '@/lib/auth/actions';
import {LOGIN_COPY} from '@/lib/copy/login';
import {WWW_ROUTES} from '@/lib/www-routes';

function signUpHref(next?: string): string {
    if (!next?.trim()) return WWW_ROUTES.signUp;
    return `${WWW_ROUTES.signUp}?next=${encodeURIComponent(next.trim())}`;
}

export function LoginForm({
    next,
    embedded = false,
}: {
    next?: string;
    embedded?: boolean;
}) {
    return (
        <SharedLoginForm
            copy={LOGIN_COPY}
            onSubmit={(form) => signIn({}, form)}
            next={next}
            embedded={embedded}
            hrefs={{
                forgotPassword: WWW_ROUTES.forgotPassword,
                signUp: signUpHref(next),
                terms: LOGIN_COPY.termsHref,
                privacy: LOGIN_COPY.privacyHref,
            }}
            googleSlot={
                <LoginGoogleButton
                    label={LOGIN_COPY.continueWithGoogle}
                    next={next}
                />
            }
        />
    );
}
