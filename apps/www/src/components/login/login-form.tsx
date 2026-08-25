'use client';

import {useState, useTransition} from 'react';
import Link from 'next/link';
import {Eye, EyeOff} from 'lucide-react';
import {zodResolver} from '@hookform/resolvers/zod';
import {useForm} from 'react-hook-form';
import {Button} from '@pakfactory/ui/components/button';
import {Input} from '@pakfactory/ui/components/input';
import {Label} from '@pakfactory/ui/components/label';
import {Separator} from '@pakfactory/ui/components/separator';
import {cn} from '@pakfactory/ui/lib/utils';
import {LoginGoogleButton} from '@/components/login/login-google-button';
import {
    authCredentialsSchema,
    type AuthCredentials,
} from '@/lib/auth/auth-form-schema';
import {signIn} from '@/lib/auth/actions';
import {LOGIN_COPY} from '@/lib/copy/login';
import {WWW_ROUTES} from '@/lib/www-routes';

const FIELD_CLASS = 'h-11 rounded-sm border border-input bg-background text-sm';

export function LoginForm({next}: {next?: string}) {
    const [showPassword, setShowPassword] = useState(false);
    // Server-side failures (wrong credentials, unconfirmed account, rate limit)
    // are separate from react-hook-form's client validation: the field errors say
    // "this input is malformed", this says "the server rejected it".
    const [serverError, setServerError] = useState<string>();
    const [pending, startTransition] = useTransition();
    const {
        register,
        handleSubmit,
        watch,
        formState: {errors},
    } = useForm<AuthCredentials>({
        resolver: zodResolver(authCredentialsSchema),
        defaultValues: {email: '', password: ''},
    });

    function onSubmit(data: AuthCredentials) {
        setServerError(undefined);
        const form = new FormData();
        form.set('email', data.email);
        form.set('password', data.password);
        if (next) form.set('next', next);

        // The action redirects on success (throwing NEXT_REDIRECT, which Next
        // handles) and returns {error} on failure, so there is nothing to do in
        // the success branch.
        startTransition(async () => {
            const result = await signIn({}, form);
            if (result?.error) setServerError(result.error);
        });
    }

    const email = watch('email');
    const password = watch('password');
    const canSubmit =
        email.trim().length > 0 && password.trim().length > 0;

    const emailField = register('email');
    const passwordField = register('password');

    return (
        <div className="flex w-full max-w-sm flex-col gap-6">
            <div className="flex flex-col gap-2 text-center">
                <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                    {LOGIN_COPY.title}
                </h1>
                <p className="text-sm text-muted-foreground">
                    {LOGIN_COPY.subtitle}
                </p>
            </div>

            <LoginGoogleButton label={LOGIN_COPY.continueWithGoogle} next={next} />

            <div className="relative flex items-center gap-4">
                <Separator className="flex-1" />
                <span className="shrink-0 text-xs text-muted-foreground">
                    {LOGIN_COPY.or}
                </span>
                <Separator className="flex-1" />
            </div>

            <form
                className="flex flex-col gap-4"
                onSubmit={handleSubmit(onSubmit)}
                noValidate
            >
                <div className="flex flex-col gap-2">
                    <Label htmlFor="login-email" className="text-xs font-medium">
                        {LOGIN_COPY.emailLabel}
                    </Label>
                    <Input
                        id="login-email"
                        type="email"
                        autoComplete="email"
                        placeholder={LOGIN_COPY.emailPlaceholder}
                        aria-invalid={!!errors.email}
                        className={FIELD_CLASS}
                        {...emailField}
                    />
                    {errors.email ? (
                        <p className="text-xs text-destructive" role="alert">
                            {errors.email.message}
                        </p>
                    ) : null}
                </div>

                <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-4">
                        <Label
                            htmlFor="login-password"
                            className="text-xs font-medium"
                        >
                            {LOGIN_COPY.passwordLabel}
                        </Label>
                        <Link
                            href={WWW_ROUTES.forgotPassword}
                            className="text-xs font-medium text-muted-foreground underline-offset-4 hover:underline"
                        >
                            {LOGIN_COPY.forgotPassword}
                        </Link>
                    </div>
                    <div className="relative">
                        <Input
                            id="login-password"
                            type={showPassword ? 'text' : 'password'}
                            autoComplete="current-password"
                            aria-invalid={!!errors.password}
                            className={cn(FIELD_CLASS, 'pr-10')}
                            {...passwordField}
                        />
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            className="absolute top-1/2 right-1 -translate-y-1/2 text-muted-foreground"
                            onClick={() => setShowPassword((prev) => !prev)}
                            aria-label={
                                showPassword
                                    ? LOGIN_COPY.hidePassword
                                    : LOGIN_COPY.showPassword
                            }
                        >
                            {showPassword ? <EyeOff /> : <Eye />}
                        </Button>
                    </div>
                    {errors.password ? (
                        <p className="text-xs text-destructive" role="alert">
                            {errors.password.message}
                        </p>
                    ) : null}
                </div>

                {serverError ? (
                    <p className="text-sm text-destructive" role="alert">
                        {serverError}
                    </p>
                ) : null}

                <Button
                    type="submit"
                    className="h-11 w-full rounded-sm"
                    disabled={!canSubmit || pending}
                >
                    {pending ? LOGIN_COPY.signingIn : LOGIN_COPY.signIn}
                </Button>
            </form>

            <p className="text-center text-sm text-foreground">
                {LOGIN_COPY.noAccount}{' '}
                <Link
                    href={WWW_ROUTES.signUp}
                    className="font-medium underline underline-offset-4"
                >
                    {LOGIN_COPY.signUp}
                </Link>
            </p>

            <p className="text-center text-xs text-muted-foreground">
                {LOGIN_COPY.legalPrefix}{' '}
                <Link
                    href={LOGIN_COPY.termsHref}
                    className="underline underline-offset-4"
                >
                    {LOGIN_COPY.termsOfService}
                </Link>{' '}
                and{' '}
                <Link
                    href={LOGIN_COPY.privacyHref}
                    className="underline underline-offset-4"
                >
                    {LOGIN_COPY.privacyPolicy}
                </Link>
                {LOGIN_COPY.legalSuffix}
            </p>
        </div>
    );
}
