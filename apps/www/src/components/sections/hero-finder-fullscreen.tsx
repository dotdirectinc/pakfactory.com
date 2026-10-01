import {Suspense} from 'react';
import {pageDielineBorderYClass} from '@pakfactory/ui/components/page-dieline-section';
import {cn} from '@pakfactory/ui/lib/utils';

import {HeroGoogleRating} from '@/components/sections/hero-google-rating';
import {HeroCtaGroup} from '@/components/ui/hero-cta-group';
import {HeroFinderFullscreenPanel} from '@/components/ui/hero-finder-fullscreen-panel';
import type {HeroFinderFullscreenContent} from '@/lib/sections/map-hero';

type HeroFinderFullscreenProps = {
    content: HeroFinderFullscreenContent;
    /** Section landmark id. */
    id?: string;
};

/**
 * Finder fullscreen hero (Studio `heroFinderFullscreen`) — 100svh active-slide
 * background, sunburst glass under copy, push-dock category rail. D35 twin of
 * the simple Finder; membership is General (Studio seats) vs Specific (rules).
 */
export function HeroFinderFullscreen({
    content,
    id = 'hero',
}: HeroFinderFullscreenProps) {
    const titleId = `${id}-heading`;
    const hasCtas = Boolean(content.primaryCta || content.secondaryCta);
    const actions =
        hasCtas || content.showReviews ? (
            <div className="flex flex-col gap-6 pt-2">
                <HeroCtaGroup
                    primary={content.primaryCta}
                    secondary={content.secondaryCta}
                />
                {content.showReviews ? (
                    <Suspense fallback={null}>
                        <HeroGoogleRating />
                    </Suspense>
                ) : null}
            </div>
        ) : null;

    return (
        <section
            id={id}
            aria-labelledby={titleId}
            className={cn(
                'scroll-mt-32',
                pageDielineBorderYClass({borderBottom: true}),
            )}
        >
            <HeroFinderFullscreenPanel
                content={content}
                titleId={titleId}
                actions={actions}
            />
        </section>
    );
}
