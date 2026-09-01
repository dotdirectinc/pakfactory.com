import {AuthSplitLayout} from '@pakfactory/auth-ui/auth-split-layout';
import Logo from '@/components/layout/logo';
import {LoginForm} from '@/components/login/login-form';
import {LOGIN_COPY} from '@/lib/copy/login';
import {WWW_ROUTES} from '@/lib/www-routes';

export function LoginPageView({next, notice}: {next?: string; notice?: string}) {
    return (
        <AuthSplitLayout
            logo={<Logo />}
            homeHref={WWW_ROUTES.home}
            testimonial={{
                quote: LOGIN_COPY.testimonialQuote,
                attribution: LOGIN_COPY.testimonialAttribution,
            }}
        >
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
