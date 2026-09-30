import {Suspense} from 'react';
import {
    pageDielineBorderYClass,
    PageDielineSection,
} from '@pakfactory/ui/components/page-dieline-section';
import {cn} from '@pakfactory/ui/lib/utils';

import {HeroGoogleRating} from '@/components/sections/hero-google-rating';
import {HeroCopy} from '@/components/ui/hero-copy';
import {HeroSpotlightCarousel} from '@/components/ui/hero-spotlight-carousel';
import type {HeroSpotlightContent} from '@/lib/sections/map-hero';

type HeroSpotlightFullBleedProps = {
    content: HeroSpotlightContent;
    /** Section landmark id. */
    id?: string;
};

/**
 * Full-bleed hero (Studio `heroSpotlightFullBleed`, PROD-2666 option B) — the
 * active spotlight fills the band edge to edge; copy sits over a scrim, the
 * slide caption bottom-right, the pager along the bottom. Same content shape
 * as the Spotlight hero. With no usable slides it falls back to a plain band.
 */
export function HeroSpotlightFullBleed({
    content,
    id = 'hero',
}: HeroSpotlightFullBleedProps) {
    const titleId = `${id}-heading`;
    const hasSlides = content.slides.length > 0;
    const tone = hasSlides ? 'inverse' : 'default';
    const copy = (
        <HeroCopy
            eyebrow={content.eyebrow}
            title={content.heading}
            titleId={titleId}
            intro={content.intro}
            primaryCta={content.primaryCta}
            secondaryCta={content.secondaryCta}
            tone={tone}
            rating={
                content.showReviews ? (
                    <Suspense fallback={null}>
                        <HeroGoogleRating tone={tone} />
                    </Suspense>
                ) : null
            }
        />
    );

    if (!hasSlides) {
        return (
            <section id={id} aria-labelledby={titleId} className="scroll-mt-32">
                <PageDielineSection as="div" borderBottom paddingBlock="lg">
                    {copy}
                </PageDielineSection>
            </section>
        );
    }

    return (
        <section
            id={id}
            aria-labelledby={titleId}
            className={cn('scroll-mt-32', pageDielineBorderYClass({borderBottom: true}))}
        >
            <HeroSpotlightCarousel
                id={id}
                layout="fullBleed"
                slides={content.slides}
                copy={copy}
            />
        </section>
    );
}
