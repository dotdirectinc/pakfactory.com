import {PageDielineSection} from '@pakfactory/ui/components/page-dieline-section';
import {cn} from '@pakfactory/ui/lib/utils';

import {SectionHeading} from '@/components/ui/section-heading';
import {
    StagesBoard,
    type StagesBoardStage,
} from '@/components/ui/stages-board';
import type {SolutionExpertiseContent} from '@/lib/solutions/types';
import {sectionThemeShell} from '@/lib/ui/section-theme';

const EXPERTISE_HEADING_ID = 'solution-expertise-heading';

type SolutionExpertiseProps = {
    content: SolutionExpertiseContent;
    className?: string;
};

/**
 * Industry Solution LP expertise band — section header + StagesBoard.
 * Props-only; first consumer of the shared StagesBoard primitive.
 */
export function SolutionExpertise({
    content,
    className,
}: SolutionExpertiseProps) {
    const {eyebrow, headline, description, cta, stages} = content;
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

    return (
        <section
            id="expertise"
            aria-labelledby={EXPERTISE_HEADING_ID}
            data-section-theme={shell['data-section-theme']}
            className={cn('scroll-mt-32', shell.bandClass, className)}
        >
            <PageDielineSection
                as="div"
                innerClassName="border-b border-dashed border-border py-16 sm:py-24"
            >
                <SectionHeading
                    eyebrow={eyebrow}
                    title={
                        <span id={EXPERTISE_HEADING_ID}>{headline}</span>
                    }
                    titleClassName="max-w-[745px]"
                    description={description}
                    descriptionClassName="max-w-[726px] text-base leading-6"
                    cta={cta}
                    ctaPlacement="end"
                />
                <div className="mt-16 sm:mt-20">
                    <StagesBoard
                        id="solution-expertise-stages"
                        stages={boardStages}
                        initialStageId="design"
                    />
                </div>
            </PageDielineSection>
        </section>
    );
}
