import type {ReactNode} from 'react';
import {PageDielineSection} from '@pakfactory/ui/components/page-dieline-section';
import {cn} from '@pakfactory/ui/lib/utils';

import {PageHeadingContent} from '@/components/common/page-heading-section';

type ComparePageHeadingSectionProps = {
    title: ReactNode;
    /** Kind toggle (and optional view controls) under the title. */
    nav?: ReactNode;
    actions?: ReactNode;
    settle?: boolean;
    /** Full-bleed bottom rule under the heading. Default true. */
    borderBottom?: boolean;
    className?: string;
};

/**
 * Compare page heading — same dieline / type rhythm as {@link PageHeadingSection},
 * with an optional nav strip under the title (Share + kind toggle live there).
 */
export function ComparePageHeadingSection({
    title,
    nav,
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
            <div className="flex w-full flex-col gap-6">
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
                {nav ? <div className="flex w-full items-center justify-between gap-x-4">{nav}</div> : null}
            </div>
        </PageDielineSection>
    );
}
