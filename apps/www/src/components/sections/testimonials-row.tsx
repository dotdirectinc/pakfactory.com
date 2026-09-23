'use client';

import {PageDielineSection} from '@pakfactory/ui/components/page-dieline-section';
import {CarouselItem} from '@pakfactory/ui/components/carousel';
import {cn} from '@pakfactory/ui/lib/utils';

import {
    SECTION_CAROUSEL_ITEM_CLASS,
    SectionCarousel,
} from '@/components/ui/section-carousel';
import {SectionHeading} from '@/components/ui/section-heading';
import {StarRating} from '@/components/ui/star-rating';
import {TestimonialCard} from '@/components/ui/testimonial-card';
import {TestimonialSourceMark} from '@/components/ui/testimonial-source-mark';
import type {
    ProductTestimonial,
    TestimonialsAggregate,
} from '@/lib/catalog/types';
import {
    sectionThemeShell,
    type SectionTheme,
} from '@/lib/ui/section-theme';

const DEFAULT_TITLE = 'Real feedback from our customers.';
const DEFAULT_DESCRIPTION =
    'Hear what our customers have to say about us after collaborating on their packaging!';

type TestimonialsRowProps = {
    items: ProductTestimonial[];
    aggregate?: TestimonialsAggregate;
    title?: string;
    description?: string;
    className?: string;
    /** Section color band (not app dark/light mode). */
    theme?: SectionTheme;
    /** Anchor id for in-page nav (PDP default). */
    sectionId?: string;
};

/**
 * Buyer reviews strip — SectionHeading + full-bleed carousel of TestimonialCards.
 * TODO(PROD-2293): wire Sanity testimonials; drop mock fallbacks in PDP.
 */
export function TestimonialsRow({
    items,
    aggregate,
    title = DEFAULT_TITLE,
    description = DEFAULT_DESCRIPTION,
    className,
    theme = 'default',
    sectionId = 'pdp-testimonials',
}: TestimonialsRowProps) {
    const shell = sectionThemeShell(theme);

    if (items.length === 0) return null;

    return (
        <section
            id={sectionId}
            data-section-theme={shell['data-section-theme']}
            className={cn('scroll-mt-32 overflow-x-clip', shell.bandClass, className)}
        >
            <PageDielineSection
                borderBottom
                innerClassName="py-16 sm:py-20"
            >
                <SectionCarousel
                    prevLabel="Previous reviews"
                    nextLabel="Next reviews"
                    header={
                        <SectionHeading
                            eyebrow="Reviews"
                            title={title}
                            description={description}
                            descriptionClassName="text-base leading-6"
                        />
                    }
                    footerStart={
                        aggregate ? (
                            <div className="flex items-center gap-2">
                                <TestimonialSourceMark
                                    source={aggregate.source}
                                    variant="icon"
                                />
                                <p className="text-sm font-medium text-foreground">
                                    {aggregate.label}{' '}
                                    <span className="tabular-nums">
                                        {aggregate.score.toFixed(1)}
                                    </span>
                                </p>
                                <StarRating value={aggregate.score} />
                            </div>
                        ) : undefined
                    }
                >
                    {items.map((item, index) => (
                        <CarouselItem
                            key={`${item.attributionName}-${index}`}
                            className={SECTION_CAROUSEL_ITEM_CLASS}
                        >
                            <TestimonialCard item={item} />
                        </CarouselItem>
                    ))}
                </SectionCarousel>
            </PageDielineSection>
        </section>
    );
}
