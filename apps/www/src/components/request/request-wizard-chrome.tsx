import type {ReactNode} from 'react';
import {pageDielineOuterClass} from '@pakfactory/ui/components/page-dieline-section';
import {cn} from '@pakfactory/ui/lib/utils';
import {
    BriefBuilderRail,
    type RequestWizardFrame,
} from '@/components/request/brief-builder-rail';
import type {WizardRailRowData} from '@/components/request/wizard-rail-row';

type RequestWizardChromeProps = {
    rows: WizardRailRowData[];
    activeKey: string;
    onSelect: (key: string) => void;
    refNumber?: string | null;
    servicesEnabled?: boolean;
    heading?: ReactNode;
    help?: ReactNode;
    /**
     * `page` — Brief Builder, window scroll under a 68px header.
     * `panel` — account shell scrolls the page; the rail sticks to the panel top.
     */
    frame?: RequestWizardFrame;
    /** Content inside the dashed main column (steps, review, read-only sections). */
    children: ReactNode;
    className?: string;
};

/**
 * Props-only Brief Builder layout chrome: dieline outer + sticky rail + dashed main.
 * Feature shells own header, dialogs, and section content.
 */
export function RequestWizardChrome({
    rows,
    activeKey,
    onSelect,
    refNumber,
    servicesEnabled = true,
    heading,
    help,
    frame = 'page',
    children,
    className,
}: RequestWizardChromeProps) {
    return (
        <div
            className={cn(
                pageDielineOuterClass(),
                'mx-auto flex w-full max-w-[var(--layout-max)] flex-1 items-stretch',
                className,
            )}
        >
            <BriefBuilderRail
                rows={rows}
                activeKey={activeKey}
                onSelect={onSelect}
                refNumber={refNumber}
                servicesEnabled={servicesEnabled}
                heading={heading}
                help={help}
                frame={frame}
            />

            <div className="flex min-w-0 flex-1 flex-col">
                <main
                    className={cn(
                        'flex flex-1 flex-col lg:border-l lg:border-r lg:border-dashed lg:border-border',
                        frame === 'panel'
                            ? 'min-h-[calc(100dvh-4rem)]'
                            : 'min-h-[calc(100dvh-68px)]',
                    )}
                >
                    {children}
                </main>
            </div>
        </div>
    );
}
