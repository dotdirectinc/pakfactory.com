/** Linear packaging units. Canonical storage for ranges is millimetres. */
export type LengthUnit = "mm" | "in";

export const MM_PER_INCH = 25.4;

export type AxisRange = {
  min?: number;
  max?: number;
};

/** Sanity dimensionRange field names (mm) + legacy depth. */
export type DimensionRangeMm = {
  lengthMin?: number;
  lengthMax?: number;
  widthMin?: number;
  widthMax?: number;
  heightMin?: number;
  heightMax?: number;
  diameterMin?: number;
  diameterMax?: number;
  gussetMin?: number;
  gussetMax?: number;
  dropMin?: number;
  dropMax?: number;
  /** Legacy Studio depth → treated as height. */
  depthMin?: number;
  depthMax?: number;
};

const AXIS_IDS = [
  "length",
  "width",
  "height",
  "diameter",
  "gusset",
  "drop",
] as const;

export type DimensionAxisId = (typeof AXIS_IDS)[number];

export function convertMeasurement(
  value: number,
  fromUnit: LengthUnit,
  toUnit: LengthUnit,
): number {
  if (fromUnit === toUnit) return value;
  if (fromUnit === "mm" && toUnit === "in") return value / MM_PER_INCH;
  return value * MM_PER_INCH;
}

export function formatMeasurement(value: number, unit: LengthUnit): string {
  if (!Number.isFinite(value)) return "";
  if (unit === "mm") {
    const rounded = Math.round(value * 10) / 10;
    return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
  }
  return (Math.round(value * 100) / 100).toFixed(2);
}

export function parseMeasurementInput(raw: string): number | null {
  const cleaned = String(raw).replace(/[^0-9.]/g, "");
  if (!cleaned || cleaned === ".") return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

export function isWithinRange(
  n: number,
  min?: number,
  max?: number,
): boolean {
  if (typeof min === "number" && n < min) return false;
  if (typeof max === "number" && n > max) return false;
  return true;
}

function convertBound(
  value: number | undefined,
  unit: LengthUnit,
): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  const converted = convertMeasurement(value, "mm", unit);
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

function boundsForAxis(
  rangeMm: DimensionRangeMm,
  axis: DimensionAxisId,
): {min?: number; max?: number} {
  switch (axis) {
    case "length":
      return {min: rangeMm.lengthMin, max: rangeMm.lengthMax};
    case "width":
      return {min: rangeMm.widthMin, max: rangeMm.widthMax};
    case "height":
      return {
        min: rangeMm.heightMin ?? rangeMm.depthMin,
        max: rangeMm.heightMax ?? rangeMm.depthMax,
      };
    case "diameter":
      return {min: rangeMm.diameterMin, max: rangeMm.diameterMax};
    case "gusset":
      return {min: rangeMm.gussetMin, max: rangeMm.gussetMax};
    case "drop":
      return {min: rangeMm.dropMin, max: rangeMm.dropMax};
  }
}

/**
 * Convert Sanity dimensionRange (mm) into per-axis min/max in `unit`.
 * Keys are Sanity axis ids (length, width, height, …).
 */
export function convertDimensionRangeToUnit(
  rangeMm: DimensionRangeMm | undefined | null,
  unit: LengthUnit,
  axisIds?: readonly string[],
): Partial<Record<string, AxisRange>> | null {
  if (!rangeMm) return null;

  const ids = axisIds?.length ? axisIds : AXIS_IDS;
  const out: Partial<Record<string, AxisRange>> = {};
  let any = false;

  for (const id of ids) {
    if (!(AXIS_IDS as readonly string[]).includes(id)) continue;
    const {min: minMm, max: maxMm} = boundsForAxis(
      rangeMm,
      id as DimensionAxisId,
    );
    const range = axisFromMm(minMm, maxMm, unit);
    if (range.min == null && range.max == null) continue;
    out[id] = range;
    any = true;
  }

  return any ? out : null;
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

export function convertMeasurementField(
  raw: string,
  fromUnit: LengthUnit,
  toUnit: LengthUnit,
): string {
  const n = parseMeasurementInput(raw);
  if (n == null) return raw;
  return formatMeasurement(convertMeasurement(n, fromUnit, toUnit), toUnit);
}

/** Convert every axis value string in a face / values map. */
export function convertAxisValues(
  values: Record<string, string>,
  fromUnit: LengthUnit,
  toUnit: LengthUnit,
): Record<string, string> {
  if (fromUnit === toUnit) return values;
  const out: Record<string, string> = {};
  for (const [key, raw] of Object.entries(values)) {
    out[key] = convertMeasurementField(raw, fromUnit, toUnit);
  }
  return out;
}
