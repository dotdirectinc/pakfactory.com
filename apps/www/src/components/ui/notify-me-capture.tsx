'use client';

import {useState, type FormEvent} from 'react';
import Link from 'next/link';
import {Button} from '@pakfactory/ui/components/button';
import {Input} from '@pakfactory/ui/components/input';
import {cn} from '@pakfactory/ui/lib/utils';
import {showToastCard} from '@/components/ui/toast-card';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
    const [email, setEmail] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [pending, setPending] = useState(false);

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const trimmed = email.trim().toLowerCase();
        if (!EMAIL_PATTERN.test(trimmed)) {
            setError('Enter a valid email address.');
            return;
        }
        setError(null);
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
            setEmail('');
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
            <form
                className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-start"
                onSubmit={handleSubmit}
                noValidate
            >
                <div className="min-w-0 flex-1">
                    <label className="sr-only" htmlFor="notify-me-email">
                        {emailLabel}
                    </label>
                    <Input
                        id="notify-me-email"
                        type="email"
                        name="email"
                        autoComplete="email"
                        value={email}
                        onChange={(event) => {
                            setEmail(event.target.value);
                            if (error) setError(null);
                        }}
                        placeholder={emailPlaceholder}
                        aria-invalid={error ? true : undefined}
                        aria-describedby={error ? 'notify-me-email-error' : undefined}
                        className="bg-background"
                        disabled={pending}
                    />
                    {error ? (
                        <p
                            id="notify-me-email-error"
                            className="mt-1 text-xs text-destructive"
                        >
                            {error}
                        </p>
                    ) : null}
                </div>
                <Button
                    type="submit"
                    className="shrink-0"
                    disabled={pending}
                >
                    {submitLabel}
                </Button>
            </form>
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
