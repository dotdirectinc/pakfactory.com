import {cn} from '@pakfactory/ui/lib/utils';

import {StarRating} from '@/components/ui/star-rating';
import {TestimonialSourceMark} from '@/components/ui/testimonial-source-mark';
import type {TestimonialsAggregate} from '@/lib/catalog/types';
import type {HeroTone} from '@/components/ui/hero-cta-group';

type HeroRatingProps = {
    aggregate: TestimonialsAggregate;
    tone?: HeroTone;
    className?: string;
};

/**
 * Review proof under hero CTAs — same pieces as `TestimonialAggregateFooter`
 * (source mark · score · count · stars) with an inverse tone for photo bands.
 */
export function HeroRating({aggregate, tone = 'default', className}: HeroRatingProps) {
    const inverse = tone === 'inverse';
    return (
        <div className={cn('flex flex-wrap items-center gap-2', className)}>
            <TestimonialSourceMark source={aggregate.source} variant="icon" />
            <p
                className={cn(
                    'text-sm font-medium',
                    inverse ? 'text-background' : 'text-foreground',
                )}
            >
                {aggregate.label}{' '}
                <span className="tabular-nums">{aggregate.score.toFixed(1)}</span>
                {aggregate.reviewCount != null ? (
                    <span
                        className={cn(
                            'font-normal',
                            inverse ? 'text-background/75' : 'text-muted-foreground',
                        )}
                    >
                        {` · ${aggregate.reviewCount.toLocaleString()} reviews`}
                    </span>
                ) : null}
            </p>
            <StarRating value={aggregate.score} />
        </div>
    );
}
