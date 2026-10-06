import {Suspense} from 'react';
import {PageDielineSection} from '@pakfactory/ui/components/page-dieline-section';

import {HeroGoogleRating} from '@/components/sections/hero-google-rating';
import {HeroCtaGroup} from '@/components/ui/hero-cta-group';
import {HeroFinderPanel} from '@/components/ui/hero-finder-panel';
import type {HeroFinderContent} from '@/lib/sections/map-hero';

type HeroFinderProps = {
    content: HeroFinderContent;
    /** Section landmark id. */
    id?: string;
};

/**
 * Finder hero (Studio `heroFinder`, PROD-2666 option C) — "Custom [line] for
 * [industry] brands." with the picked line and a matching case study below.
 * RSC shell; the pickers are a client island, the CTAs and rating stay server.
 */
export function HeroFinder({content, id = 'hero'}: HeroFinderProps) {
    const titleId = `${id}-heading`;
    const hasCtas = Boolean(content.primaryCta || content.secondaryCta);
    const actions =
        hasCtas || content.showReviews ? (
            <div className="flex flex-col gap-6 pt-4">
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
            <PageDielineSection as="div" borderBottom paddingBlock="md">
                <HeroFinderPanel content={content} titleId={titleId} actions={actions} />
            </PageDielineSection>
        </section>
    );
}
