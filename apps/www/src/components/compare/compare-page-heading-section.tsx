import type {ReactNode} from 'react';
import {PageDielineSection} from '@pakfactory/ui/components/page-dieline-section';
import {cn} from '@pakfactory/ui/lib/utils';

import {PageHeadingContent} from '@/components/common/page-heading-section';

type ComparePageHeadingSectionProps = {
    title: ReactNode;
    actions?: ReactNode;
    settle?: boolean;
    /** Full-bleed dashed bottom rule. Default true (same as PageHeadingSection). */
    borderBottom?: boolean;
    className?: string;
};

/**
 * Compare page heading — same dieline / type rhythm as {@link PageHeadingSection},
 * with a right-side utilities slot (kind toggle + Share) the shared heading lacks.
 */
export function ComparePageHeadingSection({
    title,
    actions,
    settle = false,
    borderBottom = true,
    className,
}: ComparePageHeadingSectionProps) {
    return (
        <PageDielineSection
            borderBottom={borderBottom}
            paddingBlock="lg"
            className={className}
        >
            <div
                className={cn(
                    'flex w-full flex-col gap-6',
                    actions && 'md:flex-row md:items-end md:justify-between md:gap-4',
                )}
            >
                <PageHeadingContent
                    eyebrow="Compare"
                    title={title}
                    settle={settle}
                />
                {actions ? (
                    <div className="flex shrink-0 items-center gap-2">{actions}</div>
                ) : null}
            </div>
        </PageDielineSection>
    );
}
