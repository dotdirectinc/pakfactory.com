'use client';

import Link from 'next/link';
import {zodResolver} from '@hookform/resolvers/zod';
import {useTransition} from 'react';
import {useForm} from 'react-hook-form';
import {Button} from '@pakfactory/ui/components/button';
import {Input} from '@pakfactory/ui/components/input';
import {Label} from '@pakfactory/ui/components/label';
import {Separator} from '@pakfactory/ui/components/separator';
import {
    forgotPasswordSchema,
    type ForgotPasswordValues,
} from '@/lib/auth/auth-form-schema';
import {requestPasswordReset} from '@/lib/auth/actions';
import {FORGOT_PASSWORD_COPY} from '@/lib/copy/forgot-password';
import {LOGIN_COPY} from '@/lib/copy/login';
import {WWW_ROUTES} from '@/lib/www-routes';

const FIELD_CLASS = 'h-11 rounded-sm border border-input bg-background text-sm';

export function ForgotPasswordForm() {
    const [pending, startTransition] = useTransition();
    const {
        register,
        handleSubmit,
        watch,
        formState: {errors},
    } = useForm<ForgotPasswordValues>({
        resolver: zodResolver(forgotPasswordSchema),
        defaultValues: {email: ''},
    });

    function onSubmit(data: ForgotPasswordValues) {
        const form = new FormData();
        form.set('email', data.email);

        // Always advances to /reset-password, registered address or not — the
        // action deliberately ignores its own result so this form cannot confirm
        // whether an account exists. Failures are logged server-side instead.
        startTransition(async () => {
            await requestPasswordReset({}, form);
        });
    }

    const email = watch('email');
    const canSubmit = email.trim().length > 0;
    const emailField = register('email');

    return (
        <div className="flex w-full max-w-sm flex-col gap-6">
            <div className="flex flex-col gap-2 text-center">
                <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                    {FORGOT_PASSWORD_COPY.title}
                </h1>
                <p className="text-sm text-muted-foreground">
                    {FORGOT_PASSWORD_COPY.subtitle}
                </p>
            </div>

            <form
                className="flex flex-col gap-4"
                onSubmit={handleSubmit(onSubmit)}
                noValidate
            >
                <div className="flex flex-col gap-2">
                    <Label
                        htmlFor="forgot-password-email"
                        className="text-xs font-medium"
                    >
                        {LOGIN_COPY.emailLabel}
                    </Label>
                    <Input
                        id="forgot-password-email"
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

                <Separator />

                <Button
                    type="submit"
                    className="h-11 w-full rounded-sm"
                    disabled={!canSubmit}
                >
                    {pending ? 'Sending…' : FORGOT_PASSWORD_COPY.sendResetCode}
                </Button>
            </form>

            <p className="text-center text-sm text-foreground">
                {FORGOT_PASSWORD_COPY.haveAccount}{' '}
                <Link
                    href={WWW_ROUTES.login}
                    className="font-medium underline underline-offset-4"
                >
                    {FORGOT_PASSWORD_COPY.signIn}
                </Link>
            </p>
        </div>
    );
}
