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
import {verifyEmail} from '@/lib/auth/actions';
import {
    verifyEmailSchema,
    type VerifyEmailValues,
} from '@/lib/auth/verify-reset-schemas';
import {VERIFY_COPY} from '@/lib/copy/verify';

const FIELD_CLASS = 'h-11 rounded-sm bg-background text-sm';

export function VerifyEmailForm({email: emailFromQuery}: {email: string}) {
    const [pending, startTransition] = useTransition();
    const [serverError, setServerError] = useState<string>();
    const form = useForm<VerifyEmailValues>({
        resolver: zodResolver(verifyEmailSchema),
        mode: 'onBlur',
        reValidateMode: 'onChange',
        defaultValues: {email: emailFromQuery, token: ''},
    });

    function onSubmit(data: VerifyEmailValues) {
        setServerError(undefined);
        const body = new FormData();
        body.set('email', data.email);
        body.set('token', data.token);
        startTransition(async () => {
            const result = await verifyEmail({}, body);
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
                {emailFromQuery ? (
                    <input type="hidden" {...form.register('email')} />
                ) : (
                    <FormField
                        control={form.control}
                        name="email"
                        render={({field}) => (
                            <FormItem>
                                <FormLabel className="text-xs font-medium">
                                    {VERIFY_COPY.emailLabel}
                                </FormLabel>
                                <FormControl>
                                    <Input
                                        type="email"
                                        autoComplete="username"
                                        className={FIELD_CLASS}
                                        {...field}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                )}
                <FormField
                    control={form.control}
                    name="token"
                    render={({field}) => (
                        <FormItem>
                            <FormLabel className="text-xs font-medium">
                                {VERIFY_COPY.codeLabel}
                            </FormLabel>
                            <FormControl>
                                <Input
                                    autoComplete="one-time-code"
                                    inputMode="numeric"
                                    className={FIELD_CLASS}
                                    {...field}
                                />
                            </FormControl>
                            <FormDescription>{VERIFY_COPY.codeHint}</FormDescription>
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
                    {pending ? 'Working…' : VERIFY_COPY.confirm}
                </Button>
            </form>
        </Form>
    );
}
