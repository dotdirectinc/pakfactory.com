'use client';

import {HighlightItem} from '@pakfactory/ui/components/highlight-item';
import {Button} from '@pakfactory/ui/components/button';
import {cn} from '@pakfactory/ui/lib/utils';
import {CUSTOMIZATION_BUILDER_COPY} from '@/components/customization-builder/copy';
import type {PrintSideValue} from '@/lib/customization-builder';

type PrintedSideGateProps = {
    printOutside: PrintSideValue;
    printInside: PrintSideValue;
    onChange: (patch: {
        printOutside?: PrintSideValue;
        printInside?: PrintSideValue;
    }) => void;
    onNeedConsultation: () => void;
    /** Gate-level Need consultation is selected. */
    consultationSelected?: boolean;
    /**
     * When false (methods visible), omit the card — CategoryTypeList owns
     * Need consultation at the end of the list.
     */
    showConsultation?: boolean;
};

function SideToggle({
    label,
    value,
    onValueChange,
}: {
    label: string;
    value: PrintSideValue;
    onValueChange: (next: PrintSideValue) => void;
}) {
    return (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <p className="text-sm font-medium leading-snug text-foreground">
                {label}
            </p>
            <div
                className="inline-flex w-fit shrink-0 rounded-lg bg-input p-[3px]"
                role="group"
                aria-label={label}
            >
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    aria-pressed={value === 'no'}
                    onClick={() => onValueChange('no')}
                    className={cn(
                        'h-7 rounded-md px-3',
                        value === 'no'
                            ? 'bg-background text-foreground shadow-sm hover:bg-background'
                            : 'text-foreground/60 hover:bg-transparent hover:text-foreground',
                    )}
                >
                    {CUSTOMIZATION_BUILDER_COPY.printedSideNo}
                </Button>
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    aria-pressed={value === 'yes'}
                    onClick={() => onValueChange('yes')}
                    className={cn(
                        'h-7 rounded-md px-3',
                        value === 'yes'
                            ? 'bg-background text-foreground shadow-sm hover:bg-background'
                            : 'text-foreground/60 hover:bg-transparent hover:text-foreground',
                    )}
                >
                    {CUSTOMIZATION_BUILDER_COPY.printedSideYes}
                </Button>
            </div>
        </div>
    );
}

/**
 * Printing-step gate: Print Outside / Print Inside before Method + Color.
 * Need consultation uses the same HighlightItem card as other categories.
 */
export function PrintedSideGate({
    printOutside,
    printInside,
    onChange,
    onNeedConsultation,
    consultationSelected = false,
    showConsultation = true,
}: PrintedSideGateProps) {
    return (
        <div className="flex flex-col gap-4 border-b border-border px-3 py-4">
            <SideToggle
                label={CUSTOMIZATION_BUILDER_COPY.printOutside}
                value={printOutside}
                onValueChange={(next) => onChange({printOutside: next})}
            />
            <SideToggle
                label={CUSTOMIZATION_BUILDER_COPY.printInside}
                value={printInside}
                onValueChange={(next) => onChange({printInside: next})}
            />
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
                            {CUSTOMIZATION_BUILDER_COPY.specialistToAdvise}
                        </p>
                    </HighlightItem>
                </div>
            ) : null}
        </div>
    );
}
