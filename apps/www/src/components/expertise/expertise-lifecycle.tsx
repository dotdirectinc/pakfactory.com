import {PageDielineSection} from '@pakfactory/ui/components/page-dieline-section';
import {cn} from '@pakfactory/ui/lib/utils';

import {SectionHeading} from '@/components/ui/section-heading';
import {StagePath} from '@/components/ui/stage-path';
import type {ExpertiseLifecycleContent} from '@/lib/expertise/lifecycle';
import {sectionThemeShell} from '@/lib/ui/section-theme';

type ExpertiseLifecycleProps = {
    content: ExpertiseLifecycleContent;
    id?: string;
    className?: string;
};

/**
 * "Where this fits" — the `expertiseSequence` Section as rendered on an
 * expertise stage page: the full lifecycle with this stage highlighted. The
 * same Section renders as `ExpertiseRow` (StagesBoard) on other hosts.
 */
export function ExpertiseLifecycle({
    content,
    id = 'lifecycle',
    className,
}: ExpertiseLifecycleProps) {
    const {
        eyebrow,
        heading,
        intro,
        steps,
        previous,
        next,
        align,
        borderTop,
        borderBottom,
    } = content;
    const shell = sectionThemeShell('default');
    const headingId = `${id}-heading`;

    return (
        <section
            id={id}
            aria-labelledby={heading ? headingId : undefined}
            data-section-theme={shell['data-section-theme']}
            className={cn('scroll-mt-32', shell.bandClass, className)}
        >
            <PageDielineSection
                as="div"
                borderTop={borderTop}
                borderBottom={borderBottom}
                paddingBlock="md"
            >
                <div className="flex flex-col gap-12">
                    {heading ? (
                        <SectionHeading
                            eyebrow={eyebrow}
                            title={<span id={headingId}>{heading}</span>}
                            description={intro}
                            align={align}
                        />
                    ) : null}
                    <StagePath
                        label={heading ?? 'Expertise stages'}
                        steps={steps}
                        previous={previous}
                        next={next}
                    />
                </div>
            </PageDielineSection>
        </section>
    );
}
