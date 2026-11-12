'use client';

import Link from 'next/link';
import {zodResolver} from '@hookform/resolvers/zod';
import {useTransition} from 'react';
import {useForm} from 'react-hook-form';
import {Button} from '@pakfactory/ui/components/button';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@pakfactory/ui/components/form';
import {Input} from '@pakfactory/ui/components/input';
import {Separator} from '@pakfactory/ui/components/separator';
import {
    forgotPasswordSchema,
    type ForgotPasswordValues,
} from '@/lib/auth/auth-form-schema';
import {requestPasswordReset} from '@/lib/auth/actions';
import {FORGOT_PASSWORD_COPY} from '@/lib/copy/forgot-password';
import {LOGIN_COPY} from '@/lib/copy/login';
import {WWW_ROUTES} from '@/lib/www-routes';

const FIELD_CLASS = 'h-11 rounded-sm bg-background text-sm';

export function ForgotPasswordForm() {
    const [pending, startTransition] = useTransition();
    const form = useForm<ForgotPasswordValues>({
        resolver: zodResolver(forgotPasswordSchema),
        mode: 'onBlur',
        reValidateMode: 'onChange',
        defaultValues: {email: ''},
    });

    function onSubmit(data: ForgotPasswordValues) {
        const body = new FormData();
        body.set('email', data.email);

        // Always advances to /reset-password, registered address or not — the
        // action deliberately ignores its own result so this form cannot confirm
        // whether an account exists. Failures are logged server-side instead.
        startTransition(async () => {
            await requestPasswordReset({}, body);
        });
    }

    const email = form.watch('email');
    const canSubmit = email.trim().length > 0;

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

            <Form {...form}>
                <form
                    className="flex flex-col gap-4"
                    onSubmit={form.handleSubmit(onSubmit)}
                    noValidate
                >
                    <FormField
                        control={form.control}
                        name="email"
                        render={({field}) => (
                            <FormItem className="gap-2">
                                <FormLabel className="text-xs font-medium">
                                    {LOGIN_COPY.emailLabel}
                                </FormLabel>
                                <FormControl>
                                    <Input
                                        type="email"
                                        autoComplete="email"
                                        placeholder={LOGIN_COPY.emailPlaceholder}
                                        className={FIELD_CLASS}
                                        {...field}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <Separator />

                    <Button
                        type="submit"
                        size="lg"
                        className="w-full"
                        disabled={!canSubmit || pending}
                    >
                        {pending ? 'Sending…' : FORGOT_PASSWORD_COPY.sendResetCode}
                    </Button>
                </form>
            </Form>

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
