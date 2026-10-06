'use client';

import {
    PortableText,
    type PortableTextComponents,
} from '@portabletext/react';
import {externalLinkAttributes} from '@pakfactory/utilities/external-link';
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from '@pakfactory/ui/components/accordion';

import type {ProductFaq} from '@/lib/catalog/types';

type FaqAccordionProps = {
    items: ProductFaq[];
    variant?: 'cards' | 'rows';
};

const faqAnswerComponents: PortableTextComponents = {
    block: {
        normal: ({children}) => (
            <p className="mb-3 last:mb-0 leading-relaxed">{children}</p>
        ),
    },
    marks: {
        strong: ({children}) => (
            <strong className="font-semibold text-foreground">{children}</strong>
        ),
        em: ({children}) => <em>{children}</em>,
        link: ({value, children}) => {
            const href: string = value?.href ?? '#';
            return (
                <a
                    href={href}
                    className="font-medium text-primary underline underline-offset-4 hover:no-underline"
                    {...externalLinkAttributes(href)}
                >
                    {children}
                </a>
            );
        },
    },
};

/**
 * Client leaf for FAQ expand/collapse. Parent {@link FaqSection} stays RSC.
 */
export function FaqAccordion({items, variant = 'cards'}: FaqAccordionProps) {
    const rows = variant === 'rows';
    const defaultOpen = 'faq-0';

    return (
        <Accordion
            type="single"
            collapsible
            defaultValue={defaultOpen}
            className={
                rows
                    ? 'w-full border-t border-border'
                    : 'flex flex-col gap-4'
            }
        >
            {items.map((item, index) => {
                const value = `faq-${index}`;

                return (
                    <AccordionItem
                        key={`${item.question}-${index}`}
                        value={value}
                        className={
                            rows
                                ? 'border-b border-border'
                                : 'rounded-2xl border-0 bg-muted px-6 sm:px-8'
                        }
                    >
                        {/* Rows change structure only — trigger, chip and type stay the shared ones. */}
                        <AccordionTrigger className="items-center gap-4 py-6 text-base font-semibold text-foreground hover:no-underline">
                            <span className="min-w-0 flex-1 text-left leading-snug">
                                {item.question}
                            </span>
                        </AccordionTrigger>
                        <AccordionContent className="pb-6 text-sm leading-relaxed text-muted-foreground">
                            {item.answer?.length ? (
                                <PortableText
                                    value={item.answer}
                                    components={faqAnswerComponents}
                                />
                            ) : (
                                item.answerPlain
                            )}
                        </AccordionContent>
                    </AccordionItem>
                );
            })}
        </Accordion>
    );
}
