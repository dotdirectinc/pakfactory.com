'use client';

import {Input} from '@pakfactory/ui/components/input';
import {Label} from '@pakfactory/ui/components/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@pakfactory/ui/components/select';
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
import {
    convertDimensionRangeToUnit,
    convertDimensionsValue,
    formatAxisRangeLabel,
    isWithinRange,
    parseMeasurementInput,
    type AxisRange,
    type LengthUnit,
} from '@/lib/units/unit-converter';

type CustomizationDimensionOptionProps = {
    answer: StepAnswer;
    face: DimensionFace | null;
    entryNote: string;
    onChange: (answer: StepAnswer) => void;
    onEntryNoteChange: (note: string) => void;
    dimensionRange?: ProductDimensionRange;
};

const FIELD_AXIS: Record<keyof FaceMeasurements, 'l' | 'w' | 'd'> = {
    length: 'l',
    width: 'w',
    height: 'd',
};

export function CustomizationDimensionOption({
    answer,
    face,
    entryNote,
    onChange,
    onEntryNoteChange,
    dimensionRange,
}: CustomizationDimensionOptionProps) {
    const notSure = answer.status === 'not-sure';
    const dimensions = getDimensionsValue(answer);
    const axesRange = convertDimensionRangeToUnit(
        dimensionRange,
        dimensions.unit,
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

    const activeFace = face;
    const measurements = dimensions[activeFace];
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

    function patchField(field: keyof FaceMeasurements, value: string) {
        commitFace({...measurements, [field]: value});
    }

    function patchUnit(unit: LengthUnit) {
        onChange({
            status: 'set',
            dimensions: convertDimensionsValue(
                getDimensionsValue(answer),
                unit,
            ),
        });
    }

    function fieldError(
        field: keyof FaceMeasurements,
        value: string,
    ): string | null {
        if (!axesRange) return null;
        const n = parseMeasurementInput(value);
        if (n == null) return null;
        const axis = FIELD_AXIS[field];
        const range = axesRange[axis];
        if (!range || (range.min == null && range.max == null)) return null;
        if (isWithinRange(n, range.min, range.max)) return null;
        const label = formatAxisRangeLabel(range, dimensions.unit);
        return label ? `Enter a value within ${label}.` : 'Out of allowed range.';
    }

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

            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Field
                    id={`dim-${activeFace}-length`}
                    label={CUSTOMIZATION_BUILDER_COPY.length}
                    value={measurements.length}
                    range={axesRange?.l}
                    unit={dimensions.unit}
                    error={fieldError('length', measurements.length)}
                    onChange={(value) => patchField('length', value)}
                />
                <Field
                    id={`dim-${activeFace}-width`}
                    label={CUSTOMIZATION_BUILDER_COPY.width}
                    value={measurements.width}
                    range={axesRange?.w}
                    unit={dimensions.unit}
                    error={fieldError('width', measurements.width)}
                    onChange={(value) => patchField('width', value)}
                />
                <Field
                    id={`dim-${activeFace}-height`}
                    label={CUSTOMIZATION_BUILDER_COPY.height}
                    value={measurements.height}
                    range={axesRange?.d}
                    unit={dimensions.unit}
                    error={fieldError('height', measurements.height)}
                    onChange={(value) => patchField('height', value)}
                />
                <div className="flex flex-col gap-1">
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

function Field({
    id,
    label,
    value,
    range,
    unit,
    error,
    onChange,
}: {
    id: string;
    label: string;
    value: string;
    range?: AxisRange;
    unit: LengthUnit;
    error: string | null;
    onChange: (value: string) => void;
}) {
    const hint =
        range && (range.min != null || range.max != null)
            ? formatAxisRangeLabel(range, unit)
            : null;

    return (
        <div className="flex flex-col gap-1">
            <Label htmlFor={id} className="text-sm font-medium">
                {label}
            </Label>
            <Input
                id={id}
                inputMode="decimal"
                value={value}
                aria-invalid={error ? true : undefined}
                onChange={(event) => onChange(event.target.value)}
                placeholder="0"
            />
            {error ? (
                <p className="text-xs text-destructive">{error}</p>
            ) : hint ? (
                <p className="text-xs text-muted-foreground">{hint}</p>
            ) : null}
        </div>
    );
}
