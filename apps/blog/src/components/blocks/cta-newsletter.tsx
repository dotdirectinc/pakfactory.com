'use client';

import {useState} from 'react';
import Link from 'next/link';
import {toast} from 'sonner';
import {Button} from '@pakfactory/ui/components/button';
import {Input} from '@pakfactory/ui/components/input';
import type {
    CtaNewsletterBlock,
    BlockProps,
} from '@/components/blocks/registry';
import {captureEvent} from '@/lib/analytics';
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
    const [isLoading, setIsLoading] = useState(false);
    const [company, setCompany] = useState(''); // honeypot — real users leave empty

    async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setIsLoading(true);
        captureEvent('newsletter_signup_submitted', {placement: 'cta-band'});
        try {
            const res = await fetch('/api/newsletter', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({email, company}),
            });
            const data = (await res.json().catch(() => ({}))) as {
                message?: string;
            };
            if (!res.ok) {
                captureEvent('newsletter_signup_failed', {
                    placement: 'cta-band',
                    status: res.status,
                });
                toast.error(
                    data.message ?? 'Something went wrong. Try again later.',
                );
                return;
            }
            captureEvent('newsletter_signup_succeeded', {placement: 'cta-band'});
            toast.success(data.message ?? "Thanks — you're on the list.");
            setEmail('');
        } catch {
            captureEvent('newsletter_signup_failed', {
                placement: 'cta-band',
                status: 'network_error',
            });
            toast.error('Something went wrong. Try again later.');
        } finally {
            setIsLoading(false);
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
            sectionClassName="bg-brand-cream"
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
                    {/* Honeypot — hidden from users; bots fill it and get silently dropped. */}
                    <input
                        type="text"
                        name="company"
                        tabIndex={-1}
                        autoComplete="off"
                        aria-hidden="true"
                        value={company}
                        onChange={(e) => setCompany(e.target.value)}
                        className="absolute left-[-9999px] h-0 w-0 opacity-0"
                    />
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
                            disabled={isLoading}
                            className="h-full min-h-0 flex-1 rounded-full border-0 bg-transparent px-4 shadow-none focus-visible:ring-0"
                        />
                        <Button
                            type="submit"
                            disabled={isLoading}
                            className="h-full shrink-0 rounded-full px-6"
                        >
                            {isLoading ? 'Signing up…' : 'Sign Up'}
                        </Button>
                    </div>
                    <p className="mt-3 text-xs text-muted-foreground/50">
                        By subscribing you agree to receive the packaging digest
                        and accept our{' '}
                        <Link
                            href="/privacy-policy"
                            className="underline underline-offset-2 hover:text-foreground"
                        >
                            Privacy Policy
                        </Link>
                        .
                    </p>
                </form>
            </div>
        </PageDielineFullBleedSection>
    );
}
