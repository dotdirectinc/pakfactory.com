'use client';

import type {PageDielinePaddingBlock} from '@pakfactory/ui/components/page-dieline-section';
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
    /** Section kicker above the heading. Defaults to Reviews. */
    eyebrow?: string;
    className?: string;
    /** Section color band (not app dark/light mode). */
    theme?: SectionTheme;
    /** Anchor id for in-page nav (PDP default). */
    sectionId?: string;
    align?: 'left' | 'center';
    borderTop?: boolean;
    borderBottom?: boolean;
    paddingBlock?: PageDielinePaddingBlock;
    cta?: {label: string; href: string};
};

/**
 * Buyer reviews strip — SectionHeading + full-bleed carousel of TestimonialCards.
 * Maps to Studio `testimonialsRow` (Layout). Quote CMS still deferred;
 * PDP and section mapper use mocks until then.
 */
export function TestimonialsRow({
    items,
    aggregate,
    title = DEFAULT_TITLE,
    description = DEFAULT_DESCRIPTION,
    eyebrow = 'Reviews',
    className,
    theme = 'default',
    sectionId = 'pdp-testimonials',
    align = 'left',
    borderTop = false,
    borderBottom = true,
    paddingBlock = 'md',
    cta,
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
                borderTop={borderTop}
                borderBottom={borderBottom}
                paddingBlock={paddingBlock}
            >
                <SectionCarousel
                    prevLabel="Previous reviews"
                    nextLabel="Next reviews"
                    header={
                        <SectionHeading
                            eyebrow={eyebrow}
                            title={title}
                            description={description}
                            align={align}
                            cta={cta}
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
