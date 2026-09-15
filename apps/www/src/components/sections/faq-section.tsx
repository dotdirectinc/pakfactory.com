'use client';

import {useState} from 'react';
import Link from 'next/link';
import {ChevronDown} from 'lucide-react';

import {Button} from '@pakfactory/ui/components/button';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@pakfactory/ui/components/collapsible';
import {PageDielineSection} from '@pakfactory/ui/components/page-dieline-section';
import {cn} from '@pakfactory/ui/lib/utils';

import {Icon} from '@/components/ui/icon';
import type {ProductFaq} from '@/lib/catalog/types';

type FaqSectionProps = {
    heading?: string;
    items: ProductFaq[];
    footerHref?: string;
    footerLabel?: string;
    className?: string;
};

/**
 * FAQ accordion — maps to Studio `faqSection` later.
 */
export function FaqSection({
    heading = 'Answers before you talk to sales',
    items,
    footerHref,
    footerLabel = 'Talk to a specialist',
    className,
}: FaqSectionProps) {
    const [openIndex, setOpenIndex] = useState<number | null>(0);

    if (items.length === 0) return null;

    return (
        <section id="pdp-faqs" className={cn('scroll-mt-20', className)}>
            <PageDielineSection innerClassName="border-b border-dashed border-border py-16 sm:py-20">
                <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
                    <h2 className="text-center text-2xl font-semibold text-brand-blue sm:text-3xl">
                        {heading}
                    </h2>

                    <div className="flex flex-col divide-y divide-border rounded-lg border border-border">
                        {items.map((item, index) => {
                            const open = openIndex === index;
                            return (
                                <Collapsible
                                    key={`${item.question}-${index}`}
                                    open={open}
                                    onOpenChange={(next) =>
                                        setOpenIndex(next ? index : null)
                                    }
                                >
                                    <CollapsibleTrigger
                                        className={cn(
                                            'flex w-full items-center justify-between gap-4 px-4 py-4 text-left sm:px-6 sm:py-5',
                                            'outline-none focus-visible:ring-2 focus-visible:ring-ring',
                                        )}
                                    >
                                        <span className="text-base font-medium text-foreground">
                                            {item.question}
                                        </span>
                                        <Icon
                                            icon={ChevronDown}
                                            size="md"
                                            className={cn(
                                                'shrink-0 text-muted-foreground transition-transform',
                                                open && 'rotate-180',
                                            )}
                                        />
                                    </CollapsibleTrigger>
                                    <CollapsibleContent>
                                        <p className="px-4 pb-4 text-sm leading-relaxed text-muted-foreground sm:px-6 sm:pb-5">
                                            {item.answerPlain}
                                        </p>
                                    </CollapsibleContent>
                                </Collapsible>
                            );
                        })}
                    </div>

                    {footerHref ? (
                        <div className="flex justify-center">
                            <Button variant="link" asChild>
                                <Link href={footerHref}>{footerLabel}</Link>
                            </Button>
                        </div>
                    ) : null}
                </div>
            </PageDielineSection>
        </section>
    );
}
