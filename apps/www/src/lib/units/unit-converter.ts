import type {ProductDimensionRange} from '@/lib/catalog/types';
import type {
    DimensionsValue,
    FaceMeasurements,
} from '@/lib/customization-builder/types';

/** Linear packaging units. Canonical storage for L/W/D/G is millimetres. */
export type LengthUnit = 'mm' | 'in';

/** Measurement axes: length, width, depth, gauge. */
export type MeasurementAxis = 'l' | 'w' | 'd' | 'g';

export const MM_PER_INCH = 25.4;

export type AxisRange = {
    min?: number;
    max?: number;
};

/** L/W/D ranges in a display unit (depth → d; height UI maps to d). */
export type DimensionAxesRange = {
    l: AxisRange;
    w: AxisRange;
    d: AxisRange;
};

export function convertMeasurement(
    value: number,
    fromUnit: LengthUnit,
    toUnit: LengthUnit,
): number {
    if (fromUnit === toUnit) return value;
    if (fromUnit === 'mm' && toUnit === 'in') return value / MM_PER_INCH;
    return value * MM_PER_INCH;
}

export function formatMeasurement(value: number, unit: LengthUnit): string {
    if (!Number.isFinite(value)) return '';
    if (unit === 'mm') {
        const rounded = Math.round(value * 10) / 10;
        return Number.isInteger(rounded)
            ? String(rounded)
            : rounded.toFixed(1);
    }
    return (Math.round(value * 100) / 100).toFixed(2);
}

export function parseMeasurementInput(raw: string): number | null {
    const cleaned = String(raw).replace(/[^0-9.]/g, '');
    if (!cleaned || cleaned === '.') return null;
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : null;
}

export function isWithinRange(
    n: number,
    min?: number,
    max?: number,
): boolean {
    if (typeof min === 'number' && n < min) return false;
    if (typeof max === 'number' && n > max) return false;
    return true;
}

function convertBound(
    value: number | undefined,
    unit: LengthUnit,
): number | undefined {
    if (typeof value !== 'number' || !Number.isFinite(value)) return undefined;
    const converted = convertMeasurement(value, 'mm', unit);
    return Number(formatMeasurement(converted, unit));
}

function axisFromMm(
    minMm: number | undefined,
    maxMm: number | undefined,
    unit: LengthUnit,
): AxisRange {
    const min = convertBound(minMm, unit);
    const max = convertBound(maxMm, unit);
    return {
        ...(min != null ? {min} : {}),
        ...(max != null ? {max} : {}),
    };
}

/**
 * Convert Sanity dimensionRange (mm) into per-axis min/max in `unit`.
 * Studio depth → axis `d` (UI height field).
 */
export function convertDimensionRangeToUnit(
    rangeMm: ProductDimensionRange | undefined | null,
    unit: LengthUnit,
): DimensionAxesRange | null {
    if (!rangeMm) return null;

    const l = axisFromMm(rangeMm.lengthMin, rangeMm.lengthMax, unit);
    const w = axisFromMm(rangeMm.widthMin, rangeMm.widthMax, unit);
    const d = axisFromMm(rangeMm.depthMin, rangeMm.depthMax, unit);

    if (
        l.min == null &&
        l.max == null &&
        w.min == null &&
        w.max == null &&
        d.min == null &&
        d.max == null
    ) {
        return null;
    }

    return {l, w, d};
}

function convertField(
    raw: string,
    fromUnit: LengthUnit,
    toUnit: LengthUnit,
): string {
    const n = parseMeasurementInput(raw);
    if (n == null) return raw;
    return formatMeasurement(convertMeasurement(n, fromUnit, toUnit), toUnit);
}

export function convertFaceMeasurements(
    face: FaceMeasurements,
    fromUnit: LengthUnit,
    toUnit: LengthUnit,
): FaceMeasurements {
    if (fromUnit === toUnit) return face;
    return {
        length: convertField(face.length, fromUnit, toUnit),
        width: convertField(face.width, fromUnit, toUnit),
        height: convertField(face.height, fromUnit, toUnit),
    };
}

export function convertDimensionsValue(
    value: DimensionsValue,
    toUnit: LengthUnit,
): DimensionsValue {
    const fromUnit = value.unit;
    if (fromUnit === toUnit) return value;
    return {
        unit: toUnit,
        external: convertFaceMeasurements(value.external, fromUnit, toUnit),
        internal: convertFaceMeasurements(value.internal, fromUnit, toUnit),
    };
}

export function formatAxisRangeLabel(
    range: AxisRange,
    unit: LengthUnit,
): string | null {
    const {min, max} = range;
    if (min == null && max == null) return null;
    if (min != null && max != null) {
        return `${formatMeasurement(min, unit)}–${formatMeasurement(max, unit)} ${unit}`;
    }
    if (min != null) return `≥ ${formatMeasurement(min, unit)} ${unit}`;
    return `≤ ${formatMeasurement(max!, unit)} ${unit}`;
}
