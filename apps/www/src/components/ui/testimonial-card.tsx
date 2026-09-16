import {cn} from '@pakfactory/ui/lib/utils';

import {StarRating} from '@/components/ui/star-rating';
import {TestimonialSourceMark} from '@/components/ui/testimonial-source-mark';
import type {ProductTestimonial} from '@/lib/catalog/types';

type TestimonialCardProps = {
    item: ProductTestimonial;
    className?: string;
};

/**
 * Props-only review card for TestimonialsRow (ADR-013).
 */
export function TestimonialCard({item, className}: TestimonialCardProps) {
    const positivesLine =
        item.positives.length > 0
            ? `Positive: ${item.positives.join(', ')}`
            : null;

    return (
        <article
            className={cn(
                'flex h-full flex-col gap-4 rounded-xl bg-muted p-6 sm:p-8',
                className,
            )}
        >
            <div className="flex flex-col gap-2">
                <StarRating value={item.rating} />
                <h3 className="text-base font-semibold text-foreground">
                    {item.attributionName}
                </h3>
                {positivesLine ? (
                    <p className="text-sm text-muted-foreground">
                        {positivesLine}
                    </p>
                ) : null}
            </div>

            <div className="border-t border-border" />

            <p className="flex-1 text-sm leading-relaxed text-foreground">
                {item.quote}
            </p>

            <TestimonialSourceMark source={item.source} />
        </article>
    );
}
