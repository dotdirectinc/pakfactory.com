'use client';

import {useState} from 'react';
import {Button} from '@pakfactory/ui/components/button';
import {Input} from '@pakfactory/ui/components/input';
import type {
    CtaNewsletterBlock,
    BlockProps,
} from '@/components/blocks/registry';
import {PageDielineFullBleedSection} from '@/components/layout/page-dieline-section';
import {
    NEWSLETTER_DIELINE_BORDER_DEFAULTS,
    resolveDielineBorders,
} from '@/lib/dieline-borders';

const DEFAULT_HEADING = 'Get the latest packaging digest';
const DEFAULT_BODY =
    'Subscribe now for latest packaging news, trends and more.';

/**
 * `ctaNewsletter` page-builder section (PROD-1506) — newsletter capture CTA.
 * Submits to `/api/newsletter` when configured. Heading/body are optional and
 * fall back to defaults.
 */
export function CtaNewsletter({
    heading,
    body,
    showTopBorder,
    showBottomBorder,
}: BlockProps<CtaNewsletterBlock>) {
    const [email, setEmail] = useState('');
    const [status, setStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>(
        'idle',
    );
    const [message, setMessage] = useState<string | null>(null);

    async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setStatus('loading');
        setMessage(null);
        try {
            const res = await fetch('/api/newsletter', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({email}),
            });
            const data = (await res.json().catch(() => ({}))) as {
                message?: string;
            };
            if (!res.ok) {
                setStatus('error');
                setMessage(
                    data.message ?? 'Something went wrong. Try again later.',
                );
                return;
            }
            setStatus('ok');
            setMessage(data.message ?? "Thanks — you're on the list.");
            setEmail('');
        } catch {
            setStatus('error');
            setMessage('Something went wrong. Try again later.');
        }
    }

    const {borderTop, borderBottom} = resolveDielineBorders(
        showTopBorder,
        showBottomBorder,
        NEWSLETTER_DIELINE_BORDER_DEFAULTS,
    );

    return (
        <PageDielineFullBleedSection
            aria-labelledby="cta-newsletter-heading"
            sectionClassName="bg-accent"
            borderTop={borderTop}
            borderBottom={borderBottom}
            innerClassName="py-10 sm:py-12"
        >
            <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between lg:gap-16">
                <div className="flex flex-col gap-4">
                    <h2
                        id="cta-newsletter-heading"
                        className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl"
                    >
                        {heading ?? DEFAULT_HEADING}
                    </h2>
                    <p className="max-w-md text-lg text-muted-foreground">
                        {body ?? DEFAULT_BODY}
                    </p>
                </div>
                <form
                    onSubmit={onSubmit}
                    className="w-full max-w-lg shrink-0 lg:ml-auto"
                >
                    <div className="flex h-14 items-center rounded-full border border-border bg-white/40 p-1">
                        <label
                            htmlFor="cta-newsletter-email"
                            className="sr-only"
                        >
                            Email address
                        </label>
                        <Input
                            id="cta-newsletter-email"
                            name="email"
                            type="email"
                            autoComplete="email"
                            placeholder="Your email address"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            disabled={status === 'loading'}
                            className="h-full min-h-0 flex-1 rounded-full border-0 bg-transparent px-4 shadow-none focus-visible:ring-0"
                        />
                        <Button
                            type="submit"
                            disabled={status === 'loading'}
                            className="h-full shrink-0 rounded-full px-6"
                        >
                            {status === 'loading' ? 'Signing up…' : 'Sign Up'}
                        </Button>
                    </div>
                    {message && (
                        <p
                            className={`mt-2 text-sm ${status === 'error' ? 'text-destructive' : 'text-muted-foreground'}`}
                            role={status === 'error' ? 'alert' : 'status'}
                        >
                            {message}
                        </p>
                    )}
                </form>
            </div>
        </PageDielineFullBleedSection>
    );
}
