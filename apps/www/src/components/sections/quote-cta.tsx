import Link from 'next/link';

import {Button} from '@pakfactory/ui/components/button';
import {PageDielineSection} from '@pakfactory/ui/components/page-dieline-section';
import {cn} from '@pakfactory/ui/lib/utils';

import {
    sectionThemeShell,
    type SectionTheme,
} from '@/lib/ui/section-theme';

type QuoteCtaProps = {
    heading?: string;
    body?: string;
    ctaLabel?: string;
    href: string;
    className?: string;
    /** Section landmark id — unique per page when rendered from `sections[]`. */
    id?: string;
    /**
     * Section color band (not app dark/light mode).
     * Defaults to `muted` for the conversion strip.
     */
    theme?: SectionTheme;
    /** Content alignment. Default `center` (PDP conversion strip). */
    align?: 'left' | 'center';
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
    id = 'pdp-quote-cta',
    theme = 'muted',
    align = 'center',
}: QuoteCtaProps) {
    const shell = sectionThemeShell(theme);
    const inverse = theme === 'inverse';

    return (
        <section
            id={id}
            data-section-theme={shell['data-section-theme']}
            className={cn('scroll-mt-20', shell.bandClass, className)}
        >
            <PageDielineSection innerClassName="py-16 sm:py-20">
                <div
                    className={cn(
                        'flex max-w-2xl flex-col gap-6',
                        align === 'center'
                            ? 'mx-auto items-center text-center'
                            : 'items-start text-left',
                    )}
                >
                    <h2
                        className={cn(
                            'text-2xl font-semibold sm:text-3xl',
                            inverse ? 'text-background' : 'text-brand-blue',
                        )}
                    >
                        {heading}
                    </h2>
                    {body ? (
                        <p
                            className={cn(
                                'text-base leading-relaxed',
                                inverse
                                    ? 'text-background/80'
                                    : 'text-muted-foreground',
                            )}
                        >
                            {body}
                        </p>
                    ) : null}
                    <Button
                        asChild
                        size="lg"
                        variant={inverse ? 'secondary' : 'default'}
                    >
                        <Link href={href}>{ctaLabel}</Link>
                    </Button>
                </div>
            </PageDielineSection>
        </section>
    );
}
