import Link from 'next/link';

import {Button} from '@pakfactory/ui/components/button';
import {PageDielineSection} from '@pakfactory/ui/components/page-dieline-section';
import {cn} from '@pakfactory/ui/lib/utils';

type QuoteCtaProps = {
    heading?: string;
    body?: string;
    ctaLabel?: string;
    href: string;
    className?: string;
};

/**
 * Conversion CTA band — maps to Studio `quoteCta` field set.
 */
export function QuoteCta({
    heading = 'Ready to get a quote?',
    body = 'Add this product to your request, or start a conversation with a packaging specialist. No cart, no commitment.',
    ctaLabel = 'Start a request',
    href,
    className,
}: QuoteCtaProps) {
    return (
        <section
            id="pdp-quote-cta"
            className={cn('scroll-mt-20 bg-muted', className)}
        >
            <PageDielineSection innerClassName="py-16 sm:py-20">
                <div className="mx-auto flex max-w-2xl flex-col items-center gap-6 text-center">
                    <h2 className="text-2xl font-semibold text-brand-blue sm:text-3xl">
                        {heading}
                    </h2>
                    {body ? (
                        <p className="text-base leading-relaxed text-muted-foreground">
                            {body}
                        </p>
                    ) : null}
                    <Button asChild size="lg">
                        <Link href={href}>{ctaLabel}</Link>
                    </Button>
                </div>
            </PageDielineSection>
        </section>
    );
}
