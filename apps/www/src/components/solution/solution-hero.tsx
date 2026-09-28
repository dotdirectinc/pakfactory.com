import Link from 'next/link';
import {
    pageDielineBorderYClass,
    pageDielineInnerClass,
    pageDielineOuterClass,
    pageDielinePaddingBlockClass,
} from '@pakfactory/ui/components/page-dieline-section';
import {Button} from '@pakfactory/ui/components/button';
import {cn} from '@pakfactory/ui/lib/utils';

import {
    PageHeadingContent,
    type PageHeadingEyebrow,
} from '@/components/common/page-heading-section';
import {SolutionProductCarousel} from '@/components/solution/solution-product-carousel';
import {HERO_SECTION_ID} from '@/components/solution/solution-hero-ids';
import {SolutionHeroScrollCue} from '@/components/solution/solution-hero-scroll-cue';
import type {SolutionHeroContent} from '@/lib/solutions/types';

const HERO_HEADING_ID = 'solution-hero-heading';

function composeHeroTitle(content: SolutionHeroContent): string {
    const keyword = content.rotatingWords[0]?.trim() ?? '';
    const lead = content.h1Lead?.trim() ?? '';
    const trail = content.h1Trail?.trim() ?? '';
    return [lead, keyword, trail].filter(Boolean).join(' ');
}

/**
 * Industry Solution LP hero — RSC shell (heading + copy) with client islands
 * for the product carousel and desktop scroll cue. Mobile CTA is SSR’d and
 * hidden from `sm` up via CSS (no breakpoint JS).
 */
export function SolutionHero({content}: {content: SolutionHeroContent}) {
    const title = composeHeroTitle(content);
    const featuredIcon = content.featuredIcon;
    const eyebrow: PageHeadingEyebrow | undefined = featuredIcon?.src
        ? {
              type: 'image',
              src: featuredIcon.src,
              alt: featuredIcon.alt,
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
                <div className={pageDielinePaddingBlockClass('sm')}>
                    <PageHeadingContent
                        align="center"
                        eyebrow={eyebrow}
                        title={title}
                        titleId={HERO_HEADING_ID}
                        description={content.subtitle || undefined}
                        settle
                        titleClassName="max-w-[1066px] text-display font-bold tracking-[-0.82px]"
                        descriptionClassName="max-w-[732px] text-xl leading-7 text-foreground"
                    >
                        <div className="flex justify-center sm:hidden">
                            <Button asChild size="xl" variant="default">
                                <Link href={content.cta.href}>
                                    {content.cta.label}
                                </Link>
                            </Button>
                        </div>
                    </PageHeadingContent>
                </div>
                <div className="pb-12">
                    <SolutionProductCarousel
                        tiles={content.tiles}
                        background="transparent"
                    />
                </div>
            </div>
            <div className="hidden sm:contents">
                <SolutionHeroScrollCue label={content.cta.label} />
            </div>
        </section>
    );
}
