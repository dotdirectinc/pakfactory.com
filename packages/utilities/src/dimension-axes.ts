/**
 * Dimension-axis catalog for DimensionField — ids match Sanity DimensionAxis
 * (length, width, height, diameter, gusset, drop).
 */

export type DimensionFieldAxis = {
  id: string;
  prefix: string;
  label: string;
};

const AXIS_CATALOG: Record<string, DimensionFieldAxis> = {
  length: {id: "length", prefix: "L", label: "Length"},
  width: {id: "width", prefix: "W", label: "Width"},
  height: {id: "height", prefix: "H", label: "Height"},
  diameter: {id: "diameter", prefix: "D", label: "Diameter"},
  gusset: {id: "gusset", prefix: "G", label: "Gusset"},
  drop: {id: "drop", prefix: "Dr", label: "Drop"},
};

/** Default rectangular L×W×H (Sanity axis ids). */
export const DEFAULT_DIMENSION_AXES: DimensionFieldAxis[] = [
  {id: "length", prefix: "L", label: "Length"},
  {id: "width", prefix: "W", label: "Width"},
  {id: "height", prefix: "H", label: "Height"},
];

/** Map Sanity axis ids → DimensionFieldAxis rows (unknown ids skipped). */
export function dimensionAxesFor(
  axisIds: readonly string[],
): DimensionFieldAxis[] {
  const out: DimensionFieldAxis[] = [];
  for (const id of axisIds) {
    const axis = AXIS_CATALOG[id];
    if (axis) out.push(axis);
  }
  return out;
}
