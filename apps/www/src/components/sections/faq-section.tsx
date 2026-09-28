import Link from 'next/link';

import {PageDielineSection} from '@pakfactory/ui/components/page-dieline-section';
import {cn} from '@pakfactory/ui/lib/utils';

import {FaqAccordion} from '@/components/sections/faq-accordion';
import {SectionHeading} from '@/components/ui/section-heading';
import type {ProductFaq} from '@/lib/catalog/types';
import {
    sectionThemeShell,
    type SectionTheme,
} from '@/lib/ui/section-theme';

const DEFAULT_DESCRIPTION =
    'Find quick answers to common questions about our custom packaging products and services.';

type FaqSectionProps = {
    heading?: string;
    description?: string;
    /** Section kicker above the heading. Defaults to FAQs. */
    eyebrow?: string;
    items: ProductFaq[];
    footerHref?: string;
    footerLabel?: string;
    className?: string;
    /** Section color band (not app dark/light mode). */
    theme?: SectionTheme;
    /** Anchor id for in-page nav (PDP default). */
    sectionId?: string;
    /** Heading alignment. Defaults to center (historical FAQ layout). */
    align?: 'left' | 'center';
    borderTop?: boolean;
    /** Outer full-bleed dashed bottom border. Defaults on for PDP. */
    borderBottom?: boolean;
    cta?: {label: string; href: string};
    /**
     * `cards` (default) — separate muted accordion cards under a centred column.
     * `rows` — full-width divider rows, larger questions (expertise pages, POC
     * `ExpertiseFaq`).
     */
    variant?: 'cards' | 'rows';
};

/**
 * FAQ section — maps to Studio `faqSection`.
 * RSC shell (heading + chrome) with a client accordion leaf.
 */
export function FaqSection({
    heading = 'Questions & Answers',
    description = DEFAULT_DESCRIPTION,
    eyebrow = 'FAQs',
    items,
    footerHref,
    footerLabel = "Let's chat",
    className,
    theme = 'default',
    sectionId = 'pdp-faqs',
    align = 'center',
    borderTop = false,
    borderBottom = true,
    cta,
    variant = 'cards',
}: FaqSectionProps) {
    const rows = variant === 'rows';
    const shell = sectionThemeShell(theme);

    if (items.length === 0) return null;

    return (
        <section
            id={sectionId}
            data-section-theme={shell['data-section-theme']}
            className={cn('scroll-mt-32', shell.bandClass, className)}
        >
            <PageDielineSection
                borderTop={borderTop}
                borderBottom={borderBottom}
                paddingBlock={rows ? 'lg' : 'md'}
            >
                <div
                    className={cn(
                        'flex w-full flex-col',
                        rows ? 'gap-12' : 'mx-auto max-w-4xl gap-8',
                    )}
                >
                    <SectionHeading
                        align={align}
                        eyebrow={eyebrow}
                        title={heading}
                        description={description}
                        cta={cta}
                    />

                    <FaqAccordion items={items} variant={variant} />

                    {footerHref ? (
                        <div className="flex justify-center">
                            <p className="text-sm text-muted-foreground">
                                Still have questions?{' '}
                                <Link
                                    href={footerHref}
                                    className="font-medium text-primary underline underline-offset-4 hover:text-primary/90"
                                >
                                    {footerLabel}.
                                </Link>
                            </p>
                        </div>
                    ) : null}
                </div>
            </PageDielineSection>
        </section>
    );
}
