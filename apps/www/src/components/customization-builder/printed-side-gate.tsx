'use client';

import {HighlightItem} from '@pakfactory/ui/components/highlight-item';
import {cn} from '@pakfactory/ui/lib/utils';
import {CUSTOMIZATION_BUILDER_COPY} from '@/components/customization-builder/copy';
import type {PrintableSide} from '@/lib/customization-builder/printable-sides';
import {shouldShowPrintedSideGate} from '@/lib/customization-builder/printable-sides';
import type {PrintSideValue} from '@/lib/customization-builder';

type PrintedSideGateProps = {
    sides: PrintableSide[];
    values: Partial<Record<string, PrintSideValue>>;
    onChange: (slug: string, next: PrintSideValue) => void;
    onNeedConsultation: () => void;
    /** Gate-level Need consultation is selected. */
    consultationSelected?: boolean;
    /**
     * When false (methods visible), omit the card — CategoryTypeList owns
     * Need consultation at the end of the list.
     */
    showConsultation?: boolean;
};

function YesNoSegment({
    id,
    label,
    value,
    onValueChange,
}: {
    id: string;
    label: string;
    value: PrintSideValue;
    onValueChange: (next: PrintSideValue) => void;
}) {
    const on = value === 'yes';
    const labelId = `print-side-${id}`;
    return (
        <div className="flex items-center justify-between gap-4">
            <p
                id={labelId}
                className="text-sm font-medium leading-snug text-foreground"
            >
                {label}
            </p>
            <div
                role="switch"
                aria-checked={on}
                aria-labelledby={labelId}
                tabIndex={0}
                className="relative inline-grid shrink-0 grid-cols-2 rounded-full bg-muted p-1"
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onValueChange(on ? 'no' : 'yes');
                    }
                    if (e.key === 'ArrowLeft') {
                        e.preventDefault();
                        onValueChange('no');
                    }
                    if (e.key === 'ArrowRight') {
                        e.preventDefault();
                        onValueChange('yes');
                    }
                }}
            >
                <span
                    aria-hidden
                    className={cn(
                        'pointer-events-none absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-full bg-background shadow-sm transition-transform duration-200',
                        on && 'translate-x-[calc(100%+0.25rem)]',
                    )}
                />
                <button
                    type="button"
                    tabIndex={-1}
                    className={cn(
                        'relative z-10 min-w-10 cursor-pointer px-3 py-1 text-center text-xs transition-colors',
                        !on
                            ? 'font-medium text-foreground'
                            : 'text-muted-foreground',
                    )}
                    onClick={() => onValueChange('no')}
                >
                    {CUSTOMIZATION_BUILDER_COPY.printedSideNo}
                </button>
                <button
                    type="button"
                    tabIndex={-1}
                    className={cn(
                        'relative z-10 min-w-10 cursor-pointer px-3 py-1 text-center text-xs transition-colors',
                        on
                            ? 'font-medium text-foreground'
                            : 'text-muted-foreground',
                    )}
                    onClick={() => onValueChange('yes')}
                >
                    {CUSTOMIZATION_BUILDER_COPY.printedSideYes}
                </button>
            </div>
        </div>
    );
}

/**
 * Printing-step gate: one No|Yes per Printable Sides value (1+).
 * Labels are always “Print {side}” so the rail summary matches the control.
 * Need consultation uses the same HighlightItem card as other categories.
 */
export function PrintedSideGate({
    sides,
    values,
    onChange,
    onNeedConsultation,
    consultationSelected = false,
    showConsultation = true,
}: PrintedSideGateProps) {
    if (!shouldShowPrintedSideGate(sides)) return null;

    return (
        <div className="flex flex-col gap-4 border-b border-border px-3 py-4">
            {sides.map((side) => (
                <YesNoSegment
                    key={side.slug}
                    id={side.slug}
                    label={CUSTOMIZATION_BUILDER_COPY.printSideLabel.replace(
                        '{side}',
                        side.title,
                    )}
                    value={values[side.slug] ?? ''}
                    onValueChange={(next) => onChange(side.slug, next)}
                />
            ))}
            {showConsultation ? (
                <div className="mt-2 border-t border-border pt-4">
                    <HighlightItem
                        selected={consultationSelected}
                        onClick={onNeedConsultation}
                        className="w-full"
                    >
                        <span
                            className={
                                consultationSelected
                                    ? 'text-sm font-medium text-foreground'
                                    : 'text-sm font-medium text-muted-foreground'
                            }
                        >
                            {CUSTOMIZATION_BUILDER_COPY.skipNotSure}
                        </span>
                        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                            {CUSTOMIZATION_BUILDER_COPY.consultationSubLine}
                        </p>
                    </HighlightItem>
                </div>
            ) : null}
        </div>
    );
}
