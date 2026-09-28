'use client';

import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from '@pakfactory/ui/components/accordion';
import {cn} from '@pakfactory/ui/lib/utils';

import type {ProductFaq} from '@/lib/catalog/types';

type FaqAccordionProps = {
    items: ProductFaq[];
    variant?: 'cards' | 'rows';
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
                        <AccordionTrigger
                            className={cn(
                                'gap-4 py-6 hover:no-underline',
                                rows
                                    ? // Plain chevron, no filled chip (POC).
                                      'items-center text-xl font-medium leading-8 text-foreground [&>span]:size-6 [&>span]:bg-transparent [&_svg]:text-muted-foreground'
                                    : 'items-center text-base font-semibold text-foreground',
                            )}
                        >
                            <span className="min-w-0 flex-1 text-left leading-snug">
                                {item.question}
                            </span>
                        </AccordionTrigger>
                        <AccordionContent
                            className={
                                rows
                                    ? 'pb-8 pr-8 text-lg leading-8 text-muted-foreground'
                                    : 'pb-6 text-sm leading-relaxed text-muted-foreground'
                            }
                        >
                            {item.answerPlain}
                        </AccordionContent>
                    </AccordionItem>
                );
            })}
        </Accordion>
    );
}
