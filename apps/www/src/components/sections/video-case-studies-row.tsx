'use client';

import {PageDielineSection} from '@pakfactory/ui/components/page-dieline-section';
import {CarouselItem} from '@pakfactory/ui/components/carousel';
import {cn} from '@pakfactory/ui/lib/utils';

import {SectionCarousel} from '@/components/ui/section-carousel';
import {SectionHeading} from '@/components/ui/section-heading';
import {
    VideoCaseStudyCard,
    type VideoCaseStudyCardData,
} from '@/components/ui/video-case-study-card';
import {
    sectionThemeShell,
    type SectionTheme,
} from '@/lib/ui/section-theme';

const HEADING_ID = 'video-case-studies-row-heading';

/** Fixed portrait slide — matches VideoCaseStudyCard width (380). */
const VIDEO_CASE_STUDY_ITEM_CLASS =
    'h-auto w-auto shrink-0 grow-0 basis-auto self-stretch pl-6';

export type VideoCaseStudiesRowCard = VideoCaseStudyCardData;

export type VideoCaseStudiesRowCta = {
    label: string;
    href: string;
};

/** Props-only content for the video-focus case studies band. */
export type VideoCaseStudiesRowContent = {
    eyebrow: string;
    headline: string;
    description?: string;
    cta?: VideoCaseStudiesRowCta;
    cards: VideoCaseStudiesRowCard[];
    align?: 'left' | 'center';
    borderTop?: boolean;
    borderBottom?: boolean;
};

type VideoCaseStudiesRowProps = {
    content: VideoCaseStudiesRowContent;
    /** Section anchor id. Default `case-studies-video`. */
    id?: string;
    className?: string;
    theme?: SectionTheme;
};

/**
 * Webflow-style portrait case studies row — separate from expand CaseStudiesRow.
 */
export function VideoCaseStudiesRow({
    content,
    id = 'case-studies-video',
    className,
    theme = 'default',
}: VideoCaseStudiesRowProps) {
    const {
        eyebrow,
        headline,
        description,
        cta,
        cards,
        align = 'left',
        borderTop = false,
        borderBottom = true,
    } = content;
    const shell = sectionThemeShell(theme);

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
                borderTop={borderTop}
                borderBottom={borderBottom}
                innerClassName="py-16 sm:py-24"
            >
                <SectionCarousel
                    prevLabel="Previous video case studies"
                    nextLabel="Next video case studies"
                    header={
                        <SectionHeading
                            eyebrow={eyebrow}
                            title={
                                <span id={HEADING_ID}>{headline}</span>
                            }
                            description={description}
                            descriptionClassName="text-base leading-6"
                            align={align}
                            cta={cta}
                            ctaPlacement="end"
                        />
                    }
                >
                    {cards.map((card) => (
                        <CarouselItem
                            key={card.id}
                            className={VIDEO_CASE_STUDY_ITEM_CLASS}
                        >
                            <VideoCaseStudyCard card={card} />
                        </CarouselItem>
                    ))}
                </SectionCarousel>
            </PageDielineSection>
        </section>
    );
}
