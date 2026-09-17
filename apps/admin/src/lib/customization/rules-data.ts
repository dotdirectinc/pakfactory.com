/**
 * Sandbox lists + DEPS / LOGIC reference tables from the HTML explorer.
 */

export type PrintMode = "both" | "outside" | "single" | "none";

export type ProductDef = {
  n: string;
  lvl: "Line" | "Style";
  print: PrintMode;
};

export type ShapeDef = {
  n: string;
  form: string;
  rule: "L14" | "L15" | null;
};

export type DepRow = {
  id: string;
  field: string;
  drivenBy: string;
  resolvedBy: string;
};

export type LogicRow = {
  id: string;
  when: string;
  then: string;
  type: string;
  appliesTo: string;
};

/** Provisional product list — not the real Line / Style / Product hierarchy. */
export const PRODUCTS: ProductDef[] = [
  { n: "Folding Carton", lvl: "Line", print: "both" },
  { n: "Rigid Box", lvl: "Line", print: "both" },
  { n: "Corrugated", lvl: "Line", print: "both" },
  { n: "Mailers", lvl: "Line", print: "outside" },
  { n: "Tin", lvl: "Line", print: "outside" },
  { n: "Pouches", lvl: "Line", print: "outside" },
  { n: "Cotton & Canvas Tote Bags", lvl: "Style", print: "outside" },
  { n: "Reusable Shopping Bags", lvl: "Style", print: "outside" },
  { n: "Insulated Cooler Bags", lvl: "Style", print: "outside" },
  { n: "Labels", lvl: "Line", print: "single" },
  { n: "Stickers", lvl: "Line", print: "single" },
  { n: "Accessories", lvl: "Line", print: "single" },
  { n: "Cardboard Insert", lvl: "Style", print: "single" },
  { n: "Foam Inserts", lvl: "Style", print: "none" },
  { n: "Molded Pulp Inserts", lvl: "Style", print: "none" },
  { n: "Plastic Tray Inserts", lvl: "Style", print: "none" },
];

export const SHAPES: ShapeDef[] = [
  { n: "Rectangular / Cuboid", form: "L × W × H", rule: null },
  { n: "Cylinder", form: "Diameter × Height", rule: "L14" },
  { n: "Bag / Pouch", form: "W × H × Gusset", rule: "L15" },
  { n: "Flat / Sheet", form: "⚠ form to confirm", rule: null },
  { n: "Other", form: "⚠ form to confirm", rule: null },
];

export const FINISHES = [
  "Uncoated / No Surface Finish",
  "Gloss",
  "Matte",
  "Soft Touch",
  "Textured",
] as const;

export const COLORS = [
  "CMYK Full Color",
  "Pantone Spot Color",
  "Hybrid Color (CMYK + Pantone)",
] as const;

export const EMBOSS = [
  "Blind Embossing",
  "Blind Debossing",
  "Registered Embossing",
  "Registered Debossing",
  "Textured Embossing & Debossing",
] as const;

export const TEXTURED = "Textured Embossing & Debossing";

export const COVERINGS = [
  "None",
  "Flocking",
  "Paper Lamination",
  "Leather Lamination",
] as const;

export const DEPS: DepRow[] = [
  {
    id: "D1",
    field: "Material",
    drivenBy: "Product Line / Style / Product",
    resolvedBy: "Products <> Materials mapping",
  },
  {
    id: "D2",
    field: "Thickness",
    drivenBy: "Chosen Material, gated by Product Style",
    resolvedBy: "Material spec per product",
  },
  {
    id: "D3",
    field: "Printing Method",
    drivenBy: "Materials & Product Line / Style",
    resolvedBy: "Material/Product <> Printing Method mapping",
  },
  {
    id: "D4",
    field: "Color System",
    drivenBy: "Chosen Printing Method",
    resolvedBy: "Method <> Colour System mapping",
  },
  {
    id: "D5",
    field: "Ink",
    drivenBy: "Materials, gated by chosen Printing Method",
    resolvedBy: "Material <> Ink mapping",
  },
  {
    id: "D6",
    field: "Surface Finish",
    drivenBy: "Materials",
    resolvedBy: "Material <> Surface Finish mapping",
  },
  {
    id: "D7",
    field: "Spot Coating",
    drivenBy: "Chosen Surface Finish",
    resolvedBy: "Surface Finish <> Spot Coating mapping",
  },
  {
    id: "D8",
    field: "Foiling",
    drivenBy: "Materials",
    resolvedBy: "Material <> Foiling mapping",
  },
  {
    id: "D9",
    field: "Embossing & Debossing",
    drivenBy: "Materials",
    resolvedBy: "Material <> Emboss/Deboss mapping",
  },
  {
    id: "D10",
    field: "Food-Safe Treatment",
    drivenBy: "Product Line / Style",
    resolvedBy: "Product <> Treatment mapping",
  },
  {
    id: "D11",
    field:
      "Handles · Opening & Access · Closures · Windows · Reinforcement & Utility · Embellishment",
    drivenBy: "Product Style",
    resolvedBy: "Style <> Add-on mapping",
  },
  {
    id: "D12",
    field: "Dimension form",
    drivenBy: "“Property — Shape” of the chosen product",
    resolvedBy: "Product property (already on the product record)",
  },
];

export const LOGIC: LogicRow[] = [
  {
    id: "L1",
    when: "Line = Tin · Pouches · Mailers, or a Bag style",
    then: "Show “Print Outside” only — no inside printing",
    type: "Visibility",
    appliesTo: "Tin · Pouches · Mailers · Bags",
  },
  {
    id: "L2",
    when: "Line = Labels · Stickers · Accessories, or Style = Cardboard Insert",
    then: "Show one “Printed?: Yes / No” toggle instead of two",
    type: "Visibility",
    appliesTo: "Labels · Stickers · Accessories · Cardboard Insert",
  },
  {
    id: "L3",
    when: "Style = Foam · Molded Pulp · Plastic Tray Insert",
    then: "Printing section does not exist at all",
    type: "Visibility",
    appliesTo: "Insert styles",
  },
  {
    id: "L4",
    when: "All print toggles = No",
    then: "Hide every other printing option below",
    type: "Visibility",
    appliesTo: "All",
  },
  {
    id: "L5",
    when: "Color System = Pantone Spot or Hybrid",
    then: "Show Pantone Count and PMS code entries",
    type: "Visibility",
    appliesTo: "All",
  },
  {
    id: "L6",
    when: "Pantone Count",
    then: "Capped at 3",
    type: "Validation",
    appliesTo: "All",
  },
  {
    id: "L7",
    when: "Pantone Count set",
    then: "One PMS code entry per count",
    type: "Validation",
    appliesTo: "All",
  },
  {
    id: "L8",
    when: "Surface Finish = Soft Touch",
    then: "All debossing options unavailable",
    type: "Availability",
    appliesTo: "All",
  },
  {
    id: "L9",
    when: "“Textured Embossing & Debossing” chosen",
    then: "Every other embossing & debossing option unavailable",
    type: "Availability",
    appliesTo: "All",
  },
  {
    id: "L10",
    when: "“Textured Embossing & Debossing” chosen",
    then: "Requires Surface Finish = Uncoated",
    type: "Validation",
    appliesTo: "All",
  },
  {
    id: "L11",
    when: "Material = Foam + Foiling chosen",
    then: "Requires Flocking, Paper Lamination or Leather Lamination",
    type: "Validation",
    appliesTo: "Foam materials",
  },
  {
    id: "L12",
    when: "Material = Foam + Embossing/Debossing chosen",
    then: "Requires Paper Lamination or Leather Lamination (Flocking is not enough)",
    type: "Validation",
    appliesTo: "Foam materials",
  },
  {
    id: "L13",
    when: "Product Line = Tin",
    then: "Size mode = stock picklist, or Custom → L × W × H (routes to specialist)",
    type: "Availability",
    appliesTo: "Tin",
  },
  {
    id: "L14",
    when: "Shape = Cylinder",
    then: "Dimension form → Diameter × Height",
    type: "Visibility",
    appliesTo: "All",
  },
  {
    id: "L15",
    when: "Shape = Bag / Pouch",
    then: "Dimension form → Width × Height × Gusset",
    type: "Visibility",
    appliesTo: "All",
  },
];

export function findProduct(name: string): ProductDef | undefined {
  return PRODUCTS.find((p) => p.n === name);
}

export function findShape(name: string): ShapeDef | undefined {
  return SHAPES.find((s) => s.n === name);
}
