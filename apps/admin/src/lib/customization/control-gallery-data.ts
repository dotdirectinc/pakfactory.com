/**
 * Control gallery examples (PROD-2614): the 13 shared `PropertyController` kinds, each shown with
 * demo values. Originally ported from the retired HTML explorer; its rule text (values, defaults,
 * conditions, required/source) was removed when the rules moved to Sanity + the shared package —
 * for what a product actually offers see Spec System → Products.
 * Control UI types live in @pakfactory/ui (shared with www).
 */

export type {
  CardItem,
  ChipItem,
  LinkItem,
  SpecSegment,
  SwatchItem,
  ToggleItem,
  UiDescriptor,
  UiKind,
  ValuesPerItem,
} from "@pakfactory/ui/components/customization/types";

import type { UiDescriptor } from "@pakfactory/ui/components/customization/types";
import { resolveProductDims } from "@pakfactory/sanity/resolve-product-dims";
import { dimensionAxesFor } from "@pakfactory/utilities/dimension-axes";
import { convertDimensionRangeToUnit } from "@pakfactory/utilities/length-units";

/** Demo mm ranges for Property Controls explorer (not live catalog data). */
const DEMO_RECT_RANGE_MM = {
  lengthMin: 50,
  lengthMax: 400,
  widthMin: 40,
  widthMax: 300,
  heightMin: 20,
  heightMax: 200,
} as const;

const DEMO_CYLINDER_RANGE_MM = {
  diameterMin: 30,
  diameterMax: 120,
  heightMin: 40,
  heightMax: 250,
} as const;

const DEMO_BAG_RANGE_MM = {
  widthMin: 80,
  widthMax: 350,
  heightMin: 100,
  heightMax: 450,
  gussetMin: 20,
  gussetMax: 120,
} as const;

function dimensionUi(
  dimensionInput: string,
  rangeMm: Parameters<typeof convertDimensionRangeToUnit>[0],
  unit: "in" | "mm" = "in",
): UiDescriptor {
  const { axes } = resolveProductDims(dimensionInput, rangeMm);
  return {
    kind: "dimension",
    unit,
    axes: dimensionAxesFor(axes),
    ranges: convertDimensionRangeToUnit(rangeMm, unit, axes),
  };
}

/** One gallery example: a label and the control(s) it demonstrates. No rule data. */
export type CatalogOption = {
  n: string;
  ui: UiDescriptor;
  uiCap?: string;
  ui2?: UiDescriptor;
  ui2Cap?: string;
};

export type Category = {
  id: string;
  icon: string;
  name: string;
  opts: CatalogOption[];
};

export const CATS: Category[] = [
  {
    id: "structure",
    icon: "▤",
    name: "Structure",
    opts: [
      {
        n: "Product/Structure",
        ui: { kind: "readonly", value: "Rigid Book-Style Hinged Box" },
      },
    ],
  },
  {
    id: "size",
    icon: "▦",
    name: "Size",
    opts: [
      {
        n: "Dimensions",
        ui: dimensionUi("rectangular", DEMO_RECT_RANGE_MM),
      },
      {
        n: "Dimensions (Cylinder)",
        ui: dimensionUi("cylinder", DEMO_CYLINDER_RANGE_MM),
      },
      {
        n: "Dimensions (Bag / Pouch)",
        ui: dimensionUi("bag-pouch", DEMO_BAG_RANGE_MM),
      },
      {
        n: "Dimensions (No Shape)",
        ui: dimensionUi("no-shape", null),
      },
      {
        n: "Size mode (Tin)",
        ui: {
          kind: "radioPick",
          choices: ["Stock size", "Custom"],
          value: "Stock size",
          pick: ["4 oz", "8 oz", "16 oz", "32 oz"],
          unit: "in",
        },
      },
      {
        n: "Board caliper",
        ui: {
          kind: "specTable",
          segments: [
            { id: "sbs", label: "SBS" },
            { id: "kraft", label: "Kraft" },
          ],
          columns: ["Caliper", "GSM", "Use"],
          rows: {
            sbs: ["16 pt", "250", "Folding carton"],
            kraft: ["18 pt", "280", "Mailer / corrugated liner"],
          },
        },
      },
    ],
  },
  {
    id: "materials",
    icon: "▥",
    name: "Materials",
    opts: [
      {
        n: "Material",
        ui: {
          kind: "listbox",
          value: "",
          hint: "10 materials — scroll for the full list. One selection only.",
          choices: [
            "SBS (Solid Bleached Sulfate)",
            "FBB (Folding Boxboard)",
            "CUK (Coated Unbleached Kraft)",
            "CCKB (Clay-Coated Kraft Back)",
            "CCWB (Clay-Coated White Back)",
            "CCNB (Clay-Coated News Back)",
            "Natural Brown Kraft",
            "URB (Uncoated Recycled Board)",
            "White Kraft",
            "Black Kraft",
          ],
        },
      },
      {
        n: "Thickness",
        ui: {
          kind: "radio",
          choices: ["12 pt", "16 pt", "18 pt", "24 pt"],
          value: "16 pt",
        },
      },
      {
        n: "Board color",
        ui: {
          kind: "swatch",
          value: "white",
          swatches: [
            { id: "white", label: "White", color: "#f5f5f3" },
            { id: "kraft", label: "Kraft", color: "#c4a574" },
            { id: "black", label: "Black", color: "#1a1a1a" },
          ],
        },
      },
      {
        n: "Corrugated flute",
        ui: {
          kind: "cardGrid",
          value: "e",
          cards: [
            { id: "e", name: "E-flute", meta: "~1.5 mm · fine print" },
            { id: "b", name: "B-flute", meta: "~3 mm · shipping" },
            { id: "c", name: "C-flute", meta: "~4 mm · cushion" },
          ],
        },
      },
    ],
  },
  {
    id: "printing",
    icon: "◑",
    name: "Printing",
    opts: [
      {
        n: "Printed Side",
        uiCap: "Standard — most products & styles",
        ui: {
          kind: "toggles",
          items: [
            { label: "Print Outside", value: true },
            { label: "Print Inside", value: false },
          ],
        },
        ui2Cap: "Labels · Stickers · Accessories · Cardboard Insert (Style)",
        ui2: {
          kind: "toggles",
          items: [{ label: "Printed?", value: true }],
        },
      },
      {
        n: "Printing Method",
        ui: {
          kind: "listbox",
          value: "",
          choices: [
            "Offset Printing",
            "Digital Printing",
            "Flexographic Printing",
            "Gravure Printing (Rotogravure)",
            "Screen Printing (Silkscreen)",
            "Heat Transfer Printing (Direct-to-Film)",
            "Sublimation",
          ],
        },
      },
      {
        n: "Color System",
        ui: {
          kind: "listbox",
          value: "",
          choices: [
            "CMYK Full Color",
            "Pantone Spot Color",
            "Hybrid Color (CMYK + Pantone)",
          ],
        },
      },
      {
        n: "Pantone Count",
        ui: { kind: "stepper", value: 1, max: 3 },
      },
      {
        n: "Pantone (PMS) codes",
        ui: { kind: "repeat", placeholder: "e.g. PMS 185 C" },
      },
      {
        n: "Ink",
        ui: {
          kind: "listbox",
          multi: true,
          values: [],
          choices: [
            "Water-Based Ink",
            "Soy-Based Ink",
            "Solvent-Based Ink",
            "UV Ink",
            "Raised Ink (Thermographic Printing)",
            "Metallic Ink",
            "Pearlescent Ink",
            "Translucent Ink",
            "Iridescent Ink",
            "Fluorescent Ink",
            "Thermochromic Ink",
            "Plastisol Ink",
          ],
        },
      },
      {
        n: "Ink set (chips)",
        ui: {
          kind: "chip",
          valuesPerItem: "many",
          values: ["water"],
          chips: [
            { id: "water", label: "Water-based" },
            { id: "soy", label: "Soy-based" },
            { id: "uv", label: "UV" },
            { id: "metallic", label: "Metallic" },
          ],
        },
      },
    ],
  },
  {
    id: "finishing",
    icon: "✦",
    name: "Finishing",
    opts: [
      {
        n: "Surface Finish",
        ui: {
          kind: "listbox",
          value: "",
          choices: [
            "Uncoated / No Surface Finish",
            "Gloss",
            "Semi-Gloss",
            "Matte",
            "Soft Touch",
            "Textured",
            "Glitter",
            "Metallic Sheen",
            "Pearlescent",
            "Holographic",
            "Anti-Scratch",
          ],
        },
      },
      {
        n: "Spot Coating",
        ui: {
          kind: "listbox",
          value: "",
          choices: [
            "Spot UV / Spot Gloss",
            "Matte Spot UV",
            "Spot Glitter",
            "Raised Spot UV",
            "Textured Spot UV",
          ],
        },
      },
      {
        n: "Foiling",
        ui: {
          kind: "listbox",
          value: "",
          choices: [
            "Hot Foil Stamping",
            "Cold Foiling",
            "Edge Foiling / Gilt Edging",
          ],
        },
      },
      {
        n: "Embossing & Debossing",
        ui: {
          kind: "listbox",
          multi: true,
          values: [],
          exclusive: "Textured Embossing & Debossing",
          choices: [
            "Blind Embossing",
            "Blind Debossing",
            "Registered Embossing",
            "Registered Debossing",
            "Combination Embossing",
            "Combination Debossing",
            "Micro/Nano Embossing",
            "Micro/Nano Debossing",
            "Multi-Level Embossing",
            "Multi-Level Debossing",
            "Textured Embossing & Debossing",
          ],
        },
      },
      {
        n: "Food-Safe Treatment",
        ui: {
          kind: "listbox",
          value: "",
          choices: [
            "Food-Grade Material",
            "Internal PE Lining",
            "Internal Aqueous Lining",
            "Wax Coating",
            "Food-Grade Lacquer",
          ],
        },
      },
    ],
  },
  {
    id: "structural",
    icon: "⊞",
    name: "Additional Customization",
    opts: [
      {
        n: "Handles",
        ui: {
          kind: "listbox",
          value: "",
          choices: [
            "Twisted Paper Handle",
            "Flat Paper Handle",
            "Diecut Handle",
            "Satin Ribbon Handle",
            "Cotton Ribbon Handle",
            "Nylon Rope Handle",
            "Twisted PP Handle",
            "Metal Handle",
            "Plastic Handle",
          ],
        },
      },
      {
        n: "Opening & Access",
        ui: {
          kind: "listbox",
          multi: true,
          values: [],
          choices: [
            "Ribbon Pull Tabs",
            "Leather Pull Tab",
            "Plastic Knob",
            "Metal Knob",
            "Ribbon Lift",
            "Thumb Notch",
            "Tear Notch",
            "Perforation",
            "Tear Strip",
          ],
        },
      },
      {
        n: "Closures",
        ui: {
          kind: "listbox",
          multi: true,
          values: [],
          choices: [
            "Velcro",
            "Metal Clasps",
            "Magnetic Closure",
            "Ribbon Closure",
            "Magnetic Interlocking Panel",
            "Standard Zipper",
            "Pocket Zipper",
            "Slider Zipper",
            "Tin Tie",
            "Tab Lock",
          ],
        },
      },
      {
        n: "Windows",
        ui: {
          kind: "listbox",
          value: "",
          choices: ["Window Patching", "Diecut Window", "Pouch Window"],
        },
      },
      {
        n: "Reinforcement & Utility",
        ui: {
          kind: "listbox",
          multi: true,
          values: [],
          choices: [
            "Paper Wallet",
            "Sleeve Pocket",
            "Ribbon Stop",
            "Beveled Edges / Tapered Edges",
            "Bubble Lining",
            "Degassing Valve",
            "Hang Hole",
          ],
        },
      },
      {
        n: "Embellishment",
        ui: {
          kind: "listbox",
          multi: true,
          values: [],
          choices: [
            "Metal Plaque",
            "Mirror",
            "Embedded LED Lighting",
            "Sound Module",
          ],
        },
      },
      {
        n: "Need help?",
        ui: {
          kind: "linkOut",
          links: [
            { label: "Talk to a packaging specialist", href: "#" },
            { label: "Finishing capability guide", href: "#" },
            { label: "Artwork file requirements", href: "#" },
          ],
        },
      },
    ],
  },
];
