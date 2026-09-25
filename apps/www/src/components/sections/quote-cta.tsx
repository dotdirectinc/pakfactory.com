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
            {/* Inverse = the expertise closing band (POC `ExpertiseCta`): taller,
                display title, larger body. */}
            <PageDielineSection
                innerClassName={inverse ? 'py-24 sm:py-28' : 'py-16 sm:py-20'}
            >
                <div
                    className={cn(
                        'flex flex-col gap-6',
                        !inverse && 'max-w-2xl',
                        align === 'center'
                            ? 'mx-auto items-center text-center'
                            : 'items-start text-left',
                    )}
                >
                    <h2
                        className={cn(
                            inverse
                                ? 'max-w-190 text-[32px] font-medium leading-[1.12] tracking-[-0.02em] text-background sm:text-[44px]'
                                : 'text-2xl font-semibold text-brand-blue sm:text-3xl',
                        )}
                    >
                        {heading}
                    </h2>
                    {body ? (
                        <p
                            className={cn(
                                inverse
                                    ? 'max-w-160 text-xl leading-9 text-background/75'
                                    : 'text-base leading-relaxed text-muted-foreground',
                            )}
                        >
                            {body}
                        </p>
                    ) : null}
                    <Button
                        asChild
                        size={inverse ? 'xl' : 'lg'}
                        variant={inverse ? 'outline' : 'default'}
                        className={
                            inverse
                                ? 'mt-2 border-transparent bg-background text-foreground hover:bg-background/90'
                                : undefined
                        }
                    >
                        <Link href={href}>{ctaLabel}</Link>
                    </Button>
                </div>
            </PageDielineSection>
        </section>
    );
}
