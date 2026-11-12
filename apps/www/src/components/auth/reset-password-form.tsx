'use client';

import {zodResolver} from '@hookform/resolvers/zod';
import {useState, useTransition} from 'react';
import {useForm} from 'react-hook-form';
import {Button} from '@pakfactory/ui/components/button';
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@pakfactory/ui/components/form';
import {Input} from '@pakfactory/ui/components/input';
import {resetPassword} from '@/lib/auth/actions';
import {
    resetPasswordSchema,
    type ResetPasswordValues,
} from '@/lib/auth/verify-reset-schemas';

const FIELD_CLASS = 'h-11 rounded-sm bg-background text-sm';

export function ResetPasswordForm({email}: {email: string}) {
    const [pending, startTransition] = useTransition();
    const [serverError, setServerError] = useState<string>();
    const form = useForm<ResetPasswordValues>({
        resolver: zodResolver(resetPasswordSchema),
        mode: 'onBlur',
        reValidateMode: 'onChange',
        defaultValues: {email, token: '', password: ''},
    });

    function onSubmit(data: ResetPasswordValues) {
        setServerError(undefined);
        const body = new FormData();
        body.set('email', data.email);
        body.set('token', data.token);
        body.set('password', data.password);
        startTransition(async () => {
            const result = await resetPassword({}, body);
            if (result?.error) setServerError(result.error);
        });
    }

    return (
        <Form {...form}>
            <form
                className="flex flex-col gap-4"
                onSubmit={form.handleSubmit(onSubmit)}
                noValidate
            >
                <input type="hidden" {...form.register('email')} />
                <FormField
                    control={form.control}
                    name="token"
                    render={({field}) => (
                        <FormItem>
                            <FormLabel className="text-xs font-medium">Code</FormLabel>
                            <FormControl>
                                <Input
                                    autoComplete="one-time-code"
                                    inputMode="numeric"
                                    className={FIELD_CLASS}
                                    {...field}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="password"
                    render={({field}) => (
                        <FormItem>
                            <FormLabel className="text-xs font-medium">
                                New password
                            </FormLabel>
                            <FormControl>
                                <Input
                                    type="password"
                                    autoComplete="new-password"
                                    className={FIELD_CLASS}
                                    {...field}
                                />
                            </FormControl>
                            <FormDescription>At least 8 characters.</FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                {serverError ? (
                    <p role="alert" className="text-sm leading-relaxed text-destructive">
                        {serverError}
                    </p>
                ) : null}
                <Button type="submit" disabled={pending} className="w-full">
                    {pending ? 'Working…' : 'Update password'}
                </Button>
            </form>
        </Form>
    );
}
