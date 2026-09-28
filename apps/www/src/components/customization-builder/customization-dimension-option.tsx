'use client';

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@pakfactory/ui/components/select';
import {Label} from '@pakfactory/ui/components/label';
import {DimensionInputs} from '@pakfactory/ui/components/customization/property-controller/dimension-field';
import {dimensionAxesFor} from '@pakfactory/utilities/dimension-axes';
import {
    convertDimensionRangeToUnit,
    formatAxisRangeLabel,
    isWithinRange,
    parseMeasurementInput,
    type LengthUnit,
} from '@pakfactory/utilities/length-units';
import {resolveProductDims} from '@pakfactory/sanity/resolve-product-dims';
import {AdditionalNoteField} from '@/components/customization-builder/ui/additional-note-field';
import {CUSTOMIZATION_BUILDER_COPY} from '@/components/customization-builder/copy';
import type {ProductDimensionRange} from '@/lib/catalog/types';
import {
    getDimensionsValue,
    patchFace,
    type DimensionFace,
    type FaceMeasurements,
    type StepAnswer,
} from '@/lib/customization-builder';
import {convertDimensionsValue} from '@/lib/units/unit-converter';

type CustomizationDimensionOptionProps = {
    answer: StepAnswer;
    face: DimensionFace | null;
    entryNote: string;
    onChange: (answer: StepAnswer) => void;
    onEntryNoteChange: (note: string) => void;
    dimensionInput?: string;
    dimensionRange?: ProductDimensionRange;
};

export function CustomizationDimensionOption({
    answer,
    face,
    entryNote,
    onChange,
    onEntryNoteChange,
    dimensionInput,
    dimensionRange,
}: CustomizationDimensionOptionProps) {
    const notSure = answer.status === 'not-sure';
    const resolved = resolveProductDims(
        dimensionInput ?? 'rectangular',
        dimensionRange,
    );
    const axisIds = resolved.axes;
    const axes = dimensionAxesFor(axisIds);
    const dimensions = getDimensionsValue(answer, axisIds);
    const axesRange = convertDimensionRangeToUnit(
        dimensionRange,
        dimensions.unit,
        axisIds,
    );

    if (notSure) {
        return (
            <div
                className="flex flex-col gap-2"
                aria-label={CUSTOMIZATION_BUILDER_COPY.detailLabel}
            >
                <h3 className="text-base font-semibold tracking-tight">
                    {CUSTOMIZATION_BUILDER_COPY.skipNotSure}
                </h3>
                <p className="text-sm text-muted-foreground">
                    {CUSTOMIZATION_BUILDER_COPY.notSureHelper}
                </p>
            </div>
        );
    }

    if (!face) {
        return (
            <div
                className="flex flex-col gap-2"
                aria-label={CUSTOMIZATION_BUILDER_COPY.detailLabel}
            >
                <p className="text-sm text-muted-foreground">
                    {CUSTOMIZATION_BUILDER_COPY.pickAnOption}
                </p>
            </div>
        );
    }

    if (axes.length === 0) {
        return (
            <div
                className="flex flex-col gap-2"
                aria-label={CUSTOMIZATION_BUILDER_COPY.detailLabel}
            >
                <p className="text-sm text-muted-foreground">
                    This product does not take dimensional measurements.
                </p>
            </div>
        );
    }

    const activeFace = face;
    const measurements = ensureFaceAxes(dimensions[activeFace], axisIds);
    const faceTitle =
        activeFace === 'external'
            ? CUSTOMIZATION_BUILDER_COPY.external
            : CUSTOMIZATION_BUILDER_COPY.internal;

    function commitFace(next: FaceMeasurements) {
        onChange({
            status: 'set',
            dimensions: patchFace(dimensions, activeFace, next),
        });
    }

    function patchUnit(unit: LengthUnit) {
        onChange({
            status: 'set',
            dimensions: convertDimensionsValue(
                getDimensionsValue(answer, axisIds),
                unit,
            ),
        });
    }

    function rangeError(): string | null {
        if (!axesRange) return null;
        for (const axis of axes) {
            const raw = measurements[axis.id] ?? '';
            const n = parseMeasurementInput(raw);
            if (n == null) continue;
            const range = axesRange[axis.id];
            if (!range || (range.min == null && range.max == null)) continue;
            if (isWithinRange(n, range.min, range.max)) continue;
            const label = formatAxisRangeLabel(range, dimensions.unit);
            return label
                ? `${axis.label}: enter a value within ${label}.`
                : `${axis.label}: out of allowed range.`;
        }
        return null;
    }

    const error = rangeError();

    return (
        <div className="flex flex-col">
            <div>
                <h3 className="text-base font-semibold tracking-tight">
                    {faceTitle}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                    {CUSTOMIZATION_BUILDER_COPY.measurements} ({dimensions.unit})
                </p>
            </div>

            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
                <div className="min-w-0 flex-1">
                    <DimensionInputs
                        unit={dimensions.unit}
                        axes={axes}
                        value={measurements}
                        ranges={axesRange}
                        onChange={(values) => commitFace(values)}
                    />
                </div>
                <div className="flex w-full flex-col gap-1 sm:w-28">
                    <Label
                        htmlFor={`dim-${activeFace}-unit`}
                        className="text-sm font-medium"
                    >
                        {CUSTOMIZATION_BUILDER_COPY.unit}
                    </Label>
                    <Select
                        value={dimensions.unit}
                        onValueChange={(value) =>
                            patchUnit(value === 'mm' ? 'mm' : 'in')
                        }
                    >
                        <SelectTrigger
                            id={`dim-${activeFace}-unit`}
                            className="w-full"
                        >
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="in">
                                {CUSTOMIZATION_BUILDER_COPY.unitIn}
                            </SelectItem>
                            <SelectItem value="mm">
                                {CUSTOMIZATION_BUILDER_COPY.unitMm}
                            </SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {error ? (
                <p className="mt-2 text-xs text-destructive">{error}</p>
            ) : null}

            <div className="mt-5 flex flex-col gap-4 border-t border-border pt-4">
                <AdditionalNoteField
                    id={`entry-note-dimensions-${activeFace}`}
                    value={entryNote}
                    onChange={onEntryNoteChange}
                    categoryLabel={faceTitle}
                />
            </div>
        </div>
    );
}

function ensureFaceAxes(
    face: FaceMeasurements,
    axisIds: readonly string[],
): FaceMeasurements {
    const next: FaceMeasurements = {};
    for (const id of axisIds) {
        next[id] = face[id] ?? '';
    }
    return next;
}
