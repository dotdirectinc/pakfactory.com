'use client';

import {REQUEST_COPY} from '@/lib/copy/request';
import {
    WizardRailRow,
    type WizardRailRowData,
} from '@/components/request/wizard-rail-row';

type BriefBuilderRailProps = {
    rows: WizardRailRowData[];
    activeKey: string;
    onSelect: (key: string) => void;
    refNumber?: string | null;
};

export function BriefBuilderRail({
    rows,
    activeKey,
    onSelect,
    refNumber,
}: BriefBuilderRailProps) {
    const displayRef = refNumber || REQUEST_COPY.refPlaceholder;

    return (
        <aside className="hidden shrink-0 bg-background lg:sticky lg:top-[68px] lg:flex lg:h-[calc(100dvh-68px)] lg:w-[300px] lg:flex-col lg:border-l lg:border-dashed lg:border-border">
            <div className="flex flex-1 flex-col px-7 pb-9 pt-6 lg:pr-8">
                <h1 className="mb-6 text-[15px] font-medium leading-snug tracking-tight">
                    {REQUEST_COPY.railHeading}
                </h1>

                <nav className="flex flex-col gap-0.5" aria-label="Request steps">
                    {rows.map((row, index) => (
                        <WizardRailRow
                            key={row.key}
                            row={row}
                            active={activeKey === row.key}
                            complete={Boolean(row.complete)}
                            isLast={index === rows.length - 1}
                            onClick={() => onSelect(row.key)}
                        />
                    ))}
                </nav>

                <div className="mt-8 border-t border-border pt-5">
                    <p className="text-[13px] text-muted-foreground">
                        {REQUEST_COPY.needHelpPrefix}{' '}
                        <button
                            type="button"
                            className="font-medium text-foreground underline underline-offset-4 hover:text-foreground/80"
                        >
                            {REQUEST_COPY.startChat}
                        </button>
                    </p>
                </div>

                <p className="mt-auto pt-8 text-[11px] text-muted-foreground/50">
                    {REQUEST_COPY.yourRefPrefix} {displayRef}
                </p>
            </div>
        </aside>
    );
}
