import {PageDielineSection} from '@pakfactory/ui/components/page-dieline-section';
import {cn} from '@pakfactory/ui/lib/utils';

import {SectionHeading} from '@/components/ui/section-heading';
import {
    StagesBoard,
    type StagesBoardStage,
} from '@/components/ui/stages-board';
import type {ExpertiseRowContent} from '@/lib/solutions/types';
import {sectionThemeShell} from '@/lib/ui/section-theme';

const EXPERTISE_HEADING_ID = 'expertise-row-heading';

type ExpertiseRowProps = {
    content: ExpertiseRowContent;
    className?: string;
    /** Section landmark id. Default `expertise`. */
    id?: string;
};

/**
 * Expertise Row — section header + StagesBoard (ADR-020).
 * Props-only; CMS `expertiseSequence` and fixture path share this band.
 */
export function ExpertiseRow({
    content,
    className,
    id = 'expertise',
}: ExpertiseRowProps) {
    const {
        eyebrow,
        headline,
        description,
        cta,
        stages,
        align = 'left',
        borderTop = false,
        borderBottom = true,
    } = content;
    if (stages.length === 0) return null;

    const shell = sectionThemeShell('default');

    const boardStages: StagesBoardStage[] = stages.map((stage) => ({
        id: stage.id,
        title: stage.title,
        headline: stage.headline,
        body: stage.body,
        points: stage.points,
        link: stage.cta
            ? {label: stage.cta.label, href: stage.cta.href}
            : undefined,
        media: stage.media?.src
            ? {src: stage.media.src, alt: stage.media.alt}
            : null,
        mediaPlaceholder: stage.mediaPlaceholder,
    }));

    const initialStageId = boardStages[0]?.id;

    return (
        <section
            id={id}
            aria-labelledby={EXPERTISE_HEADING_ID}
            data-section-theme={shell['data-section-theme']}
            className={cn('scroll-mt-32', shell.bandClass, className)}
        >
            <PageDielineSection
                as="div"
                borderTop={borderTop}
                borderBottom={borderBottom}
                innerClassName="py-16 sm:py-24"
            >
                <SectionHeading
                    eyebrow={eyebrow}
                    title={
                        <span id={EXPERTISE_HEADING_ID}>{headline}</span>
                    }
                    titleClassName="max-w-[745px]"
                    description={description}
                    descriptionClassName="max-w-[726px] text-base leading-6"
                    align={align}
                    cta={cta}
                    ctaPlacement="end"
                />
                <div className="mt-16 sm:mt-20">
                    <StagesBoard
                        id={`${id}-stages`}
                        stages={boardStages}
                        initialStageId={initialStageId}
                    />
                </div>
            </PageDielineSection>
        </section>
    );
}
