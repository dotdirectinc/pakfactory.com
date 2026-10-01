import {Suspense} from 'react';

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
 * Finder fullscreen hero (Studio `heroFinderFullscreen`) — below-nav frame
 * (`100dvh - var(--site-nav-offset)`), sunburst glass under copy, push-dock category rail. D35 twin of
 * the simple Finder; membership is General (Studio seats) vs Specific (rules).
 * Dieline chrome (dashed rails + bottom rule) lives on the panel via
 * PageDielineSection.
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
        <section id={id} aria-labelledby={titleId} className="scroll-mt-32">
            <HeroFinderFullscreenPanel
                content={content}
                titleId={titleId}
                actions={actions}
            />
        </section>
    );
}
