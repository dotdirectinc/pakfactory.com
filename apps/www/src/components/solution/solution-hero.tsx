'use client';

import {useEffect, useState} from 'react';
import {
    pageDielineBorderYClass,
    pageDielineInnerClass,
    pageDielineOuterClass,
} from '@pakfactory/ui/components/page-dieline-section';
import {cn} from '@pakfactory/ui/lib/utils';

import {
    PageHeadingContent,
    type PageHeadingEyebrow,
} from '@/components/common/page-heading-section';
import {SolutionProductCarousel} from '@/components/solution/solution-product-carousel';
import {
    HERO_SECTION_ID,
    SolutionHeroScrollCue,
} from '@/components/solution/solution-hero-scroll-cue';
import type {SolutionHeroContent} from '@/lib/solutions/types';

const HERO_HEADING_ID = 'solution-hero-heading';

function composeHeroTitle(content: SolutionHeroContent): string {
    const keyword = content.rotatingWords[0]?.trim() ?? '';
    const lead = content.h1Lead?.trim() ?? '';
    const trail = content.h1Trail?.trim() ?? '';
    return [lead, keyword, trail].filter(Boolean).join(' ');
}

function useIsMobile(): boolean {
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const mq = window.matchMedia('(max-width: 639px)');
        const sync = () => setIsMobile(mq.matches);
        sync();
        mq.addEventListener('change', sync);
        return () => mq.removeEventListener('change', sync);
    }, []);

    return isMobile;
}

/**
 * Industry Solution LP hero — heading + responsive scroll-scrubbed tiles.
 * Mobile: primary CTA in the heading. Desktop/tablet: fixed scroll cue.
 */
export function SolutionHero({content}: {content: SolutionHeroContent}) {
    const title = composeHeroTitle(content);
    const isMobile = useIsMobile();
    const kit = content.kitMark;
    const eyebrow: PageHeadingEyebrow | undefined = kit?.src
        ? {
              type: 'image',
              src: kit.src,
              alt: kit.alt,
              width: 128,
              height: 128,
          }
        : undefined;

    return (
        <section
            id={HERO_SECTION_ID}
            aria-labelledby={HERO_HEADING_ID}
            className={cn(
                pageDielineOuterClass(),
                pageDielineBorderYClass({borderBottom: true}),
                'relative overflow-x-clip',
            )}
        >
            <div className={pageDielineInnerClass()}>
                <div className="py-16 sm:py-24">
                    <PageHeadingContent
                        align="center"
                        eyebrow={eyebrow}
                        title={title}
                        titleId={HERO_HEADING_ID}
                        description={content.subtitle || undefined}
                        primaryCta={isMobile ? content.cta : undefined}
                        titleClassName="max-w-[1066px] text-[clamp(2.25rem,5vw,4rem)] font-bold leading-[1.1] tracking-[-0.82px]"
                        descriptionClassName="max-w-[732px] text-xl leading-7 text-foreground"
                    />
                </div>
                <div className="pb-12">
                    <SolutionProductCarousel
                        tiles={content.tiles}
                        background="transparent"
                    />
                </div>
            </div>
            {!isMobile ? (
                <SolutionHeroScrollCue label={content.cta.label} />
            ) : null}
        </section>
    );
}
