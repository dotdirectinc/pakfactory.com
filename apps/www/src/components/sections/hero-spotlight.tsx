import {Suspense} from 'react';
import {PageDielineSection} from '@pakfactory/ui/components/page-dieline-section';

import {HeroGoogleRating} from '@/components/sections/hero-google-rating';
import {HeroCopy} from '@/components/ui/hero-copy';
import {HeroSpotlightCarousel} from '@/components/ui/hero-spotlight-carousel';
import type {HeroSpotlightContent} from '@/lib/sections/map-hero';

type HeroSpotlightProps = {
    content: HeroSpotlightContent;
    /** Section landmark id. */
    id?: string;
};

/**
 * Spotlight hero (Studio `heroSpotlight`, PROD-2666 option A) — fixed copy on
 * the left, rotating case studies / products / industries on the right.
 */
export function HeroSpotlight({content, id = 'hero'}: HeroSpotlightProps) {
    const titleId = `${id}-heading`;
    const copy = (
        <HeroCopy
            eyebrow={content.eyebrow}
            title={content.heading}
            titleId={titleId}
            intro={content.intro}
            primaryCta={content.primaryCta}
            secondaryCta={content.secondaryCta}
            rating={
                content.showReviews ? (
                    <Suspense fallback={null}>
                        <HeroGoogleRating />
                    </Suspense>
                ) : null
            }
        />
    );

    return (
        <section id={id} aria-labelledby={titleId} className="scroll-mt-32">
            <PageDielineSection as="div" borderBottom paddingBlock="sm">
                {content.slides.length > 0 ? (
                    <HeroSpotlightCarousel
                        id={id}
                        layout="split"
                        slides={content.slides}
                        copy={copy}
                    />
                ) : (
                    copy
                )}
            </PageDielineSection>
        </section>
    );
}
