/**
 * @deprecated Import from `@pakfactory/utilities/length-units` instead.
 * Thin re-export + DimensionsValue helpers for the customization builder.
 */
export {
    MM_PER_INCH,
    convertAxisValues,
    convertDimensionRangeToUnit,
    convertMeasurement,
    convertMeasurementField,
    formatAxisRangeLabel,
    formatMeasurement,
    isWithinRange,
    parseMeasurementInput,
    type AxisRange,
    type DimensionRangeMm,
    type LengthUnit,
} from '@pakfactory/utilities/length-units';

import {convertAxisValues} from '@pakfactory/utilities/length-units';
import type {LengthUnit} from '@pakfactory/utilities/length-units';
import type {DimensionsValue} from '@/lib/customization-builder/types';

export function convertDimensionsValue(
    value: DimensionsValue,
    toUnit: LengthUnit,
): DimensionsValue {
    const fromUnit = value.unit;
    if (fromUnit === toUnit) return value;
    return {
        unit: toUnit,
        external: convertAxisValues(value.external, fromUnit, toUnit),
        internal: convertAxisValues(value.internal, fromUnit, toUnit),
    };
}
