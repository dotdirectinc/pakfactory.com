'use client';

import type {PageDielinePaddingBlock} from '@pakfactory/ui/components/page-dieline-section';
import {PageDielineSection} from '@pakfactory/ui/components/page-dieline-section';
import {CarouselItem} from '@pakfactory/ui/components/carousel';
import {cn} from '@pakfactory/ui/lib/utils';

import {TestimonialsMarqueeBand} from '@/components/sections/testimonials-marquee-band';
import {
    SECTION_CAROUSEL_ITEM_CLASS,
    SectionCarousel,
} from '@/components/ui/section-carousel';
import {SectionHeading} from '@/components/ui/section-heading';
import {TestimonialAggregateFooter} from '@/components/ui/testimonial-aggregate-footer';
import {TestimonialCard} from '@/components/ui/testimonial-card';
import type {
    ProductTestimonial,
    TestimonialsAggregate,
} from '@/lib/catalog/types';
import type {
    TestimonialsAggregatePlacement,
    TestimonialsLayoutVariant,
} from '@/lib/sections/map-testimonials-row';
import {
    sectionThemeShell,
    type SectionTheme,
} from '@/lib/ui/section-theme';

const DEFAULT_TITLE = 'Real feedback from our customers.';
const DEFAULT_DESCRIPTION =
    'Hear what our customers have to say about us after collaborating on their packaging!';

const DEFAULT_VIEW_ALL_LABEL = 'View all reviews';

type TestimonialsRowProps = {
    items: ProductTestimonial[];
    aggregate?: TestimonialsAggregate;
    /** Google Maps place reviews profile (heading CTA fallback). */
    reviewsProfileUrl?: string;
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
    /** Carousel (arrows) vs dual-row marquee. Default carousel. */
    layoutVariant?: TestimonialsLayoutVariant;
    /** Where to show Google aggregate. Default footer. */
    aggregatePlacement?: TestimonialsAggregatePlacement;
};

/**
 * Buyer reviews strip — SectionHeading + carousel or dual-row marquee.
 * Maps to Studio `testimonialsRow`. Live Google quotes via Places;
 * PDP may still use mocks.
 */
export function TestimonialsRow({
    items,
    aggregate,
    reviewsProfileUrl,
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
    layoutVariant = 'carousel',
    aggregatePlacement = 'footer',
}: TestimonialsRowProps) {
    const shell = sectionThemeShell(theme);

    if (items.length === 0) return null;

    const headingCta =
        cta ??
        (reviewsProfileUrl
            ? {label: DEFAULT_VIEW_ALL_LABEL, href: reviewsProfileUrl}
            : undefined);

    const showAggregateAsEyebrow =
        aggregatePlacement === 'eyebrow' && aggregate != null;
    const showAggregateInFooter =
        aggregatePlacement === 'footer' && aggregate != null;

    const header = (
        <div className="flex flex-col gap-6">
            {showAggregateAsEyebrow ? (
                <TestimonialAggregateFooter aggregate={aggregate} />
            ) : null}
            <SectionHeading
                eyebrow={showAggregateAsEyebrow ? undefined : eyebrow}
                title={title}
                description={description}
                align={align}
                cta={headingCta}
                ctaPlacement={align === 'center' ? 'bottom' : 'end'}
                descriptionClassName="text-base leading-6"
            />
        </div>
    );

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
                {layoutVariant === 'marquee' ? (
                    <div className="flex flex-col gap-16">
                        {header}
                        <TestimonialsMarqueeBand
                            items={items}
                            aggregate={
                                showAggregateInFooter ? aggregate : undefined
                            }
                        />
                    </div>
                ) : (
                    <SectionCarousel
                        prevLabel="Previous reviews"
                        nextLabel="Next reviews"
                        header={header}
                        footerStart={
                            showAggregateInFooter ? (
                                <TestimonialAggregateFooter
                                    aggregate={aggregate}
                                />
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
                )}
            </PageDielineSection>
        </section>
    );
}
