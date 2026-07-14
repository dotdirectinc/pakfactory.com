'use client';

import type {PortableTextBlock} from '@portabletext/types';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@pakfactory/ui/components/collapsible';
import {ChevronDown} from 'lucide-react';
import {PortableText} from '@/components/ui/portable-text';
import type {PostFaqItem} from '@/lib/blog-post';

type PostFaqSectionProps = {
    items: PostFaqItem[];
};

export function PostFaqSection({items}: PostFaqSectionProps) {
    const faqItems = items.filter((item) => item.question?.trim());
    if (faqItems.length === 0) return null;

    return (
        <section
            className="mt-16 border-t border-dashed border-border pt-16"
            aria-labelledby="post-faq-heading"
        >
            <h2
                id="post-faq-heading"
                className="text-3xl font-semibold tracking-tight text-foreground"
            >
                Frequently asked questions
            </h2>
            <div className="mt-8 flex flex-col gap-3">
                {faqItems.map((item) => (
                    <Collapsible
                        key={item.question}
                        className="rounded-lg border border-border px-4"
                        defaultOpen={false}
                    >
                        <CollapsibleTrigger className="flex w-full items-center justify-between gap-4 py-4 text-left text-base font-medium text-foreground [&[data-state=open]>svg]:rotate-180">
                            {item.question}
                            <ChevronDown
                                className="size-4 shrink-0 text-muted-foreground transition-transform"
                                aria-hidden
                            />
                        </CollapsibleTrigger>
                        <CollapsibleContent className="pb-4 text-muted-foreground">
                            {item.answer?.length ? (
                                <PortableText
                                    value={item.answer as PortableTextBlock[]}
                                    className="text-sm"
                                />
                            ) : (
                                <p className="text-sm leading-6">
                                    {item.answerText}
                                </p>
                            )}
                        </CollapsibleContent>
                    </Collapsible>
                ))}
            </div>
        </section>
    );
}
