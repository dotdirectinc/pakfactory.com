import {StarRating} from '@/components/ui/star-rating';
import {TestimonialSourceMark} from '@/components/ui/testimonial-source-mark';
import type {TestimonialsAggregate} from '@/lib/catalog/types';

type TestimonialAggregateFooterProps = {
    aggregate: TestimonialsAggregate;
};

/**
 * Google / Trustpilot aggregate strip — score, review count, stars.
 */
export function TestimonialAggregateFooter({
    aggregate,
}: TestimonialAggregateFooterProps) {
    const reviewCountLabel =
        aggregate.reviewCount != null
            ? ` · ${aggregate.reviewCount.toLocaleString()} reviews`
            : '';

    return (
        <div className="flex items-center gap-2">
            <TestimonialSourceMark source={aggregate.source} variant="icon" />
            <p className="text-sm font-medium text-foreground">
                {aggregate.label}{' '}
                <span className="tabular-nums">{aggregate.score.toFixed(1)}</span>
                {reviewCountLabel ? (
                    <span className="font-normal text-muted-foreground">
                        {reviewCountLabel}
                    </span>
                ) : null}
            </p>
            <StarRating value={aggregate.score} />
        </div>
    );
}
