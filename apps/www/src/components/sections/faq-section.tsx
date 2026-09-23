'use client';

import Link from 'next/link';

import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from '@pakfactory/ui/components/accordion';
import {PageDielineSection} from '@pakfactory/ui/components/page-dieline-section';
import {cn} from '@pakfactory/ui/lib/utils';

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
};

/**
 * FAQ accordion — maps to Studio `faqSection`.
 * Centered SectionHeading by default + separate muted Accordion cards.
 */
export function FaqSection({
    heading = 'Questions & Answers',
    description = DEFAULT_DESCRIPTION,
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
}: FaqSectionProps) {
    const shell = sectionThemeShell(theme);

    if (items.length === 0) return null;

    const defaultOpen = 'faq-0';

    return (
        <section
            id={sectionId}
            data-section-theme={shell['data-section-theme']}
            className={cn('scroll-mt-32', shell.bandClass, className)}
        >
            <PageDielineSection
                borderTop={borderTop}
                borderBottom={borderBottom}
                paddingBlock="md"
            >
                <div className="mx-auto flex w-full max-w-4xl flex-col gap-8">
                    <SectionHeading
                        align={align}
                        eyebrow="FAQs"
                        title={heading}
                        description={description}
                        cta={cta}
                    />

                    <Accordion
                        type="single"
                        collapsible
                        defaultValue={defaultOpen}
                        className="flex flex-col gap-4"
                    >
                        {items.map((item, index) => {
                            const value = `faq-${index}`;

                            return (
                                <AccordionItem
                                    key={`${item.question}-${index}`}
                                    value={value}
                                    className="rounded-2xl border-0 bg-muted px-6 sm:px-8"
                                >
                                    <AccordionTrigger
                                        className={cn(
                                            'gap-4 py-6 hover:no-underline',
                                            'items-center text-base font-semibold text-foreground',
                                        )}
                                    >
                                        <span className="min-w-0 flex-1 text-left leading-snug">
                                            {item.question}
                                        </span>
                                    </AccordionTrigger>
                                    <AccordionContent className="pb-6 text-sm leading-relaxed text-muted-foreground">
                                        {item.answerPlain}
                                    </AccordionContent>
                                </AccordionItem>
                            );
                        })}
                    </Accordion>

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
