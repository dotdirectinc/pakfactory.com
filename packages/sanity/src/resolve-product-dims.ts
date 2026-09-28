import {axesFor, type DimensionAxis} from "./dimension-inputs";

/** Flat mm bounds as stored on product.dimensionRange. */
export type ProductDimensionRangeMm = {
  lengthMin?: number | null;
  lengthMax?: number | null;
  widthMin?: number | null;
  widthMax?: number | null;
  heightMin?: number | null;
  heightMax?: number | null;
  diameterMin?: number | null;
  diameterMax?: number | null;
  gussetMin?: number | null;
  gussetMax?: number | null;
  dropMin?: number | null;
  dropMax?: number | null;
  depthMin?: number | null;
  depthMax?: number | null;
};

export type AxisRangeMm = {
  min?: number;
  max?: number;
};

export type ResolvedProductDims = {
  axes: readonly DimensionAxis[];
  rangesMm: Partial<Record<DimensionAxis, AxisRangeMm>>;
};

function num(value: number | null | undefined): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function boundsFor(
  range: ProductDimensionRangeMm,
  axis: DimensionAxis,
): AxisRangeMm {
  switch (axis) {
    case "length":
      return {min: num(range.lengthMin), max: num(range.lengthMax)};
    case "width":
      return {min: num(range.widthMin), max: num(range.widthMax)};
    case "height":
      return {
        min: num(range.heightMin) ?? num(range.depthMin),
        max: num(range.heightMax) ?? num(range.depthMax),
      };
    case "diameter":
      return {min: num(range.diameterMin), max: num(range.diameterMax)};
    case "gusset":
      return {min: num(range.gussetMin), max: num(range.gussetMax)};
    case "drop":
      return {min: num(range.dropMin), max: num(range.dropMax)};
  }
}

/**
 * Active axes for a product shape + mm min/max for those axes only.
 */
export function resolveProductDims(
  dimensionInput: string | undefined | null,
  dimensionRange: ProductDimensionRangeMm | undefined | null,
): ResolvedProductDims {
  const axes = axesFor(dimensionInput);
  const rangesMm: Partial<Record<DimensionAxis, AxisRangeMm>> = {};
  if (dimensionRange) {
    for (const axis of axes) {
      const bounds = boundsFor(dimensionRange, axis);
      if (bounds.min != null || bounds.max != null) {
        rangesMm[axis] = bounds;
      }
    }
  }
  return {axes, rangesMm};
}
