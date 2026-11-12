'use client';

import {zodResolver} from '@hookform/resolvers/zod';
import Link from 'next/link';
import {useState} from 'react';
import {useForm} from 'react-hook-form';
import {z} from 'zod';
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
import {cn} from '@pakfactory/ui/lib/utils';
import {showToastCard} from '@/components/ui/toast-card';

const notifyMeSchema = z.object({
    email: z
        .string()
        .trim()
        .min(1, 'Enter a valid email address.')
        .email('Enter a valid email address.'),
});

type NotifyMeValues = z.infer<typeof notifyMeSchema>;

export type NotifyMeCaptureProps = {
    title: string;
    description: string;
    /** Accessible label for the email field. */
    emailLabel?: string;
    emailPlaceholder?: string;
    submitLabel?: string;
    successTitle?: string;
    successDescription?: string;
    specialistHref?: string;
    specialistLabel?: string;
    /**
     * Optional hook for a future server action. When omitted, submit only
     * validates and shows a success toast (UI stub).
     */
    onSubmit?: (email: string) => void | Promise<void>;
    /** Optional context for future waitlist wiring (slug, doc id). */
    contextId?: string;
    className?: string;
};

/**
 * Props-only email capture for “notify me when this launches” (and similar).
 * No feature imports — reusable across www catalog rails and marketing bands.
 */
export function NotifyMeCapture({
    title,
    description,
    emailLabel = 'Email',
    emailPlaceholder = 'you@company.com',
    submitLabel = 'Notify me',
    successTitle = "You're on the list",
    successDescription = "We'll email you when this launches.",
    specialistHref,
    specialistLabel = 'Talk to a specialist',
    onSubmit,
    className,
}: NotifyMeCaptureProps) {
    const [pending, setPending] = useState(false);
    const form = useForm<NotifyMeValues>({
        resolver: zodResolver(notifyMeSchema),
        mode: 'onBlur',
        reValidateMode: 'onChange',
        defaultValues: {email: ''},
    });

    async function handleSubmit(data: NotifyMeValues) {
        const trimmed = data.email.trim().toLowerCase();
        setPending(true);
        try {
            if (onSubmit) {
                await onSubmit(trimmed);
            }
            showToastCard({
                title: successTitle,
                description: successDescription,
                dismissLabel: 'Dismiss',
            });
            form.reset({email: ''});
        } catch {
            showToastCard({
                title: "Couldn't subscribe",
                description: 'Try again in a moment.',
                dismissLabel: 'Dismiss',
            });
        } finally {
            setPending(false);
        }
    }

    return (
        <div
            className={cn(
                'rounded-lg border border-border bg-muted/40 p-5',
                className,
            )}
        >
            <p className="text-sm font-semibold text-foreground">{title}</p>
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
            <Form {...form}>
                <form
                    className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-start"
                    onSubmit={form.handleSubmit(handleSubmit)}
                    noValidate
                >
                    <FormField
                        control={form.control}
                        name="email"
                        render={({field}) => (
                            <FormItem className="min-w-0 flex-1 gap-1">
                                <FormLabel className="sr-only">{emailLabel}</FormLabel>
                                <FormControl>
                                    <Input
                                        type="email"
                                        autoComplete="email"
                                        placeholder={emailPlaceholder}
                                        className="bg-background"
                                        disabled={pending}
                                        {...field}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <Button type="submit" className="shrink-0" disabled={pending}>
                        {submitLabel}
                    </Button>
                </form>
            </Form>
            {specialistHref ? (
                <Link
                    href={specialistHref}
                    className="mt-3 inline-block text-sm font-medium text-primary underline underline-offset-4"
                >
                    {specialistLabel}
                </Link>
            ) : null}
        </div>
    );
}
