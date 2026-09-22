'use client';

import {useEffect, useState} from 'react';
import {PageDielineSection} from '@pakfactory/ui/components/page-dieline-section';
import {CarouselItem, type CarouselApi} from '@pakfactory/ui/components/carousel';
import {cn} from '@pakfactory/ui/lib/utils';

import {
    ExpandableCaseStudyCard,
    type ExpandableCaseStudyCardData,
} from '@/components/ui/expandable-case-study-card';
import {SectionCarousel} from '@/components/ui/section-carousel';
import {SectionHeading} from '@/components/ui/section-heading';
import {
    sectionThemeShell,
    type SectionTheme,
} from '@/lib/ui/section-theme';

/** Matches ExpandableCaseStudyCard width transition (duration-500). */
const EXPAND_REINIT_MS = 520;

const HEADING_ID = 'case-studies-row-heading';

/** Slide sizing driven by ExpandableCaseStudyCard inline width (not fixed basis). */
const CASE_STUDY_CAROUSEL_ITEM_CLASS =
    'h-auto w-auto shrink-0 grow-0 basis-auto self-stretch pl-6';

export type CaseStudiesRowCard = ExpandableCaseStudyCardData;

export type CaseStudiesRowCta = {
    label: string;
    href: string;
};

/** Props-only content for Studio `caseStudiesRow` / Industry LP Fork 7. */
export type CaseStudiesRowContent = {
    eyebrow: string;
    headline: string;
    description?: string;
    cta?: CaseStudiesRowCta;
    cards: CaseStudiesRowCard[];
};

type CaseStudiesRowProps = {
    content: CaseStudiesRowContent;
    /** Section anchor id. Default `case-studies`. */
    id?: string;
    className?: string;
    theme?: SectionTheme;
};

/**
 * Case studies expand-rail section — Sanity `caseStudiesRow` front-end.
 * Same Embla SectionCarousel layout as ProductsRow (full-bleed + bottom nav).
 */
export function CaseStudiesRow({
    content,
    id = 'case-studies',
    className,
    theme = 'default',
}: CaseStudiesRowProps) {
    const {eyebrow, headline, description, cta, cards} = content;
    const [hovered, setHovered] = useState<number | null>(null);
    const [api, setApi] = useState<CarouselApi>();

    const shell = sectionThemeShell(theme);
    const isOpen = (i: number) => i % 2 === 1 || hovered === i;

    // Odd-index cards start expanded — remeasure once Embla mounts.
    useEffect(() => {
        if (!api) return;
        const t = window.setTimeout(() => api.reInit(), 0);
        return () => clearTimeout(t);
    }, [api]);

    // Remeasure after expand/collapse width transition.
    useEffect(() => {
        if (!api) return;
        const t = window.setTimeout(() => api.reInit(), EXPAND_REINIT_MS);
        return () => clearTimeout(t);
    }, [api, hovered]);

    // Clear hover when leaving the Embla viewport (same as former rail mouseleave).
    useEffect(() => {
        if (!api) return;
        const root = api.rootNode();
        const onLeave = () => setHovered(null);
        root.addEventListener('mouseleave', onLeave);
        return () => root.removeEventListener('mouseleave', onLeave);
    }, [api]);

    if (cards.length === 0) return null;

    return (
        <section
            id={id}
            aria-labelledby={HEADING_ID}
            data-section-theme={shell['data-section-theme']}
            className={cn(
                'scroll-mt-32 overflow-x-clip',
                shell.bandClass,
                className,
            )}
        >
            <PageDielineSection
                as="div"
                innerClassName="border-b border-dashed border-border py-16 sm:py-24"
            >
                <SectionCarousel
                    setApi={setApi}
                    prevLabel="Previous case studies"
                    nextLabel="Next case studies"
                    header={
                        <SectionHeading
                            eyebrow={eyebrow}
                            title={
                                <span id={HEADING_ID}>{headline}</span>
                            }
                            description={description}
                            descriptionClassName="text-base leading-6"
                            cta={cta}
                            ctaPlacement="end"
                        />
                    }
                >
                    {cards.map((card, i) => (
                        <CarouselItem
                            key={card.id}
                            className={CASE_STUDY_CAROUSEL_ITEM_CLASS}
                        >
                            <ExpandableCaseStudyCard
                                card={card}
                                expanded={isOpen(i)}
                                onFocus={() => setHovered(i)}
                            />
                        </CarouselItem>
                    ))}
                </SectionCarousel>
            </PageDielineSection>
        </section>
    );
}
