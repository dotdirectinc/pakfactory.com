'use client';

import {PropertyFieldPanel} from '@pakfactory/ui/components/customization/property-controller/property-field-panel';
import {Button} from '@pakfactory/ui/components/button';
import {Input} from '@pakfactory/ui/components/input';
import type {PropertySelectionMap} from '@/components/customization/option-property-controllers';
import {CUSTOMIZATION_BUILDER_COPY} from '@/components/customization-builder/copy';
import {
    PANTONE_MAX_COUNT,
    pantoneSelectionPatch,
    readPantoneSelection,
    resizePantoneCodes,
} from '@/components/customization-builder/pantone-property';

type PantonePropertyControllersProps = {
    value: PropertySelectionMap;
    /** Full selection map after Pantone keys are updated (caller merges summaries). */
    onChange: (selections: PropertySelectionMap) => void;
    variant?: 'card' | 'ghost';
};

/**
 * Pantone Spot / Hybrid: count stepper (max 3) + one PMS input per count.
 * Stepper − trims the last row; per-row − removes that index (middle allowed).
 */
export function PantonePropertyControllers({
    value,
    onChange,
    variant = 'ghost',
}: PantonePropertyControllersProps) {
    const {count, codes} = readPantoneSelection(value);

    function apply(countNext: number, codesNext: string[]) {
        onChange({
            ...value,
            ...pantoneSelectionPatch(countNext, codesNext),
        });
    }

    function setCount(nextCount: number) {
        apply(nextCount, codes);
    }

    function setCodeAt(index: number, nextValue: string) {
        const nextCodes = resizePantoneCodes(codes, count);
        nextCodes[index] = nextValue;
        apply(count, nextCodes);
    }

    function removeRowAt(index: number) {
        if (count <= 1) return;
        const nextCodes = resizePantoneCodes(codes, count).filter(
            (_, i) => i !== index,
        );
        apply(nextCodes.length, nextCodes);
    }

    return (
        <div className="flex flex-col gap-4">
            <PropertyFieldPanel
                title={CUSTOMIZATION_BUILDER_COPY.pantoneCountLabel}
                titleValue={String(count)}
                variant={variant}
            >
                <div
                    className="inline-flex h-9 w-fit items-center gap-1 rounded-lg bg-muted p-[3px]"
                    role="group"
                    aria-label={CUSTOMIZATION_BUILDER_COPY.pantoneCountLabel}
                >
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="size-8 shrink-0 p-0 text-foreground/60 hover:bg-transparent hover:text-foreground disabled:opacity-40"
                        disabled={count <= 1}
                        aria-label={CUSTOMIZATION_BUILDER_COPY.pantoneCountDecrease}
                        onClick={() => setCount(count - 1)}
                    >
                        –
                    </Button>
                    <span
                        className="inline-flex h-[calc(100%-2px)] min-w-10 shrink-0 items-center justify-center rounded-md bg-background px-3 text-sm font-medium text-foreground shadow-sm tabular-nums"
                        aria-live="polite"
                    >
                        {count}
                    </span>
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="size-8 shrink-0 p-0 text-foreground/60 hover:bg-transparent hover:text-foreground disabled:opacity-40"
                        disabled={count >= PANTONE_MAX_COUNT}
                        aria-label={CUSTOMIZATION_BUILDER_COPY.pantoneCountIncrease}
                        onClick={() => setCount(count + 1)}
                    >
                        +
                    </Button>
                </div>
            </PropertyFieldPanel>

            <PropertyFieldPanel
                title={CUSTOMIZATION_BUILDER_COPY.pantonePmsLabel}
                variant={variant}
            >
                <div className="flex flex-col gap-2">
                    {codes.map((code, index) => (
                        <div
                            key={`pantone-pms-${index}`}
                            className="flex items-center gap-2"
                        >
                            <Input
                                value={code}
                                placeholder={
                                    CUSTOMIZATION_BUILDER_COPY.pantonePmsPlaceholder
                                }
                                onChange={(event) =>
                                    setCodeAt(index, event.target.value)
                                }
                                className="min-w-0 flex-1"
                                aria-label={`${CUSTOMIZATION_BUILDER_COPY.pantonePmsLabel} ${index + 1}`}
                            />
                            {count > 1 ? (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="size-8 shrink-0 p-0"
                                    aria-label={
                                        CUSTOMIZATION_BUILDER_COPY.pantonePmsRemove
                                    }
                                    onClick={() => removeRowAt(index)}
                                >
                                    –
                                </Button>
                            ) : null}
                        </div>
                    ))}
                </div>
            </PropertyFieldPanel>
        </div>
    );
}
