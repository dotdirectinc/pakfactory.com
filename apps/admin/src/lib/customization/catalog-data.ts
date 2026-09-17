/**
 * Catalog data ported from public/customization-logic-explorer.html CATS.
 * HTML “Option” row ≈ Studio customizationType (Type panel).
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

export type CatalogOption = {
  n: string;
  type: string;
  card: "Single" | "Multi" | string;
  req: boolean;
  src: string;
  vals: string;
  def: string;
  cond?: string;
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
        type: "Read-only (from PDP)",
        card: "Single",
        req: true,
        src: "Buyer",
        vals: "= the chosen product",
        def: "—",
        cond: "Sets the Product Line/Style, which drives some of the options below.",
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
        type: "Dimension form",
        card: "Single",
        req: true,
        src: "Buyer + confirm",
        vals: "L×W×H / D(Diameter)×H / W×H×G / W×H×G + Drop / W×H / Diameter",
        def: "L×W×H",
        cond: "Dictated by the “Property — Shape” field of the chosen product. For example, Cylinder shape product = Diameter × Height, Bag/Pouch = Width × Height × Gusset.",
        ui: { kind: "dims", unit: "in" },
      },
      {
        n: "Size mode (Tin)",
        type: "Radio + picklist",
        card: "Single",
        req: true,
        src: "Buyer",
        vals: "Stock size / Custom",
        def: "Stock",
        cond: "Tin only. Custom routes to specialist.",
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
        type: "Spec table",
        card: "Single",
        req: false,
        src: "Buyer",
        vals: "pt / gsm by board family",
        def: "SBS",
        cond: "Demo control — Property / Property Value presentation; not a live mapping rule.",
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
        type: "List",
        card: "Single per type",
        req: false,
        src: "Buyer",
        vals: "per line/style/product",
        def: "—",
        cond: "List depends on Product Line / Style / Product; refer to Products &lt;&gt; Materials mapping.",
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
        type: "Radio",
        card: "Single",
        req: false,
        src: "Buyer + confirm",
        vals: "per material",
        def: "—",
        cond: "List depends on Material Type &amp; gated by Product Style.",
        ui: {
          kind: "radio",
          choices: ["12 pt", "16 pt", "18 pt", "24 pt"],
          value: "16 pt",
        },
      },
      {
        n: "Board color",
        type: "Swatch",
        card: "Single",
        req: false,
        src: "Buyer",
        vals: "White / Kraft / Black",
        def: "White",
        cond: "Demo control — Property / Property Value presentation; not a live mapping rule.",
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
        type: "Card grid",
        card: "Single",
        req: false,
        src: "Buyer + confirm",
        vals: "E / B / C flute",
        def: "E",
        cond: "Demo control — Property / Property Value presentation; not a live mapping rule.",
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
        type: "Toggle",
        card: "Single per toggle",
        req: true,
        src: "Buyer",
        vals: "Yes / No",
        def: "Yes (Print Outside only)",
        cond: `<ul>
      <li>Only show the “Print Outside” toggle for: Tin, Pouches, Mailers, Cotton &amp; Canvas Tote Bags (Style), Reusable Shopping Bags (Style), Insulated Cooler Bags (Style)</li>
      <li>Only show a “Printed?: Yes/No” toggle for Labels, Stickers, Accessories, Cardboard Insert (Style)</li>
      <li>For Product Styles: Foam Inserts, Molded Pulp Inserts, Plastic Tray Inserts, which cannot be printed, this part does not exist</li>
      <li><b>If user chooses “No” for all toggles, hides all other printing options below.</b></li>
    </ul>`,
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
        type: "List",
        card: "Single",
        req: false,
        src: "Buyer + confirm",
        vals: "Offset / Digital / Flexo / Roto, etc.",
        def: "—",
        cond: "List depends on Materials &amp; Product Line/Style; refer to Material/Product &lt;&gt; Printing Method mapping.",
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
        type: "List",
        card: "Single",
        req: false,
        src: "Buyer + confirm",
        vals: "CMYK Full Color / Pantone Spot Color / Hybrid Color (CMYK + Pantone)",
        def: "—",
        cond: "List gated by chosen Printing Method.",
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
        type: "Stepper",
        card: "Single",
        req: false,
        src: "Buyer",
        vals: "1 / 2 / 3 (Max)",
        def: "1",
        cond: "Shown only if chosen Color System = Pantone / Hybrid. Max 3.",
        ui: { kind: "stepper", value: 1, max: 3 },
      },
      {
        n: "Pantone (PMS) codes",
        type: "Text (repeatable)",
        card: "Multi",
        req: false,
        src: "Buyer",
        vals: "PMS code entries",
        def: "—",
        cond: "One entry per Pantone count.",
        ui: { kind: "repeat", placeholder: "e.g. PMS 185 C" },
      },
      {
        n: "Ink",
        type: "List",
        card: "Multi",
        req: false,
        src: "Buyer + confirm",
        vals: "Water-based / Soy-based / Solvent-based, etc.",
        def: "—",
        cond: "List depends on Materials, gated by chosen Printing Method.",
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
        type: "Chip",
        card: "Multi",
        req: false,
        src: "Buyer",
        vals: "Water / Soy / UV / Metallic",
        def: "—",
        cond: "Demo control — Property / Property Value presentation; not a live mapping rule.",
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
        type: "List",
        card: "Single",
        req: false,
        src: "Buyer",
        vals: "Uncoated / Gloss / Matte / Soft Touch, etc.",
        def: "—",
        cond: "List depends on Materials.",
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
        type: "List",
        card: "Single",
        req: false,
        src: "Buyer + confirm",
        vals: "Spot UV/Spot Gloss, Matte Spot UV, Spot Glitter, Raised Spot UV, Textured Spot UV",
        def: "—",
        cond: "List gated by chosen Surface Finish.",
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
        type: "List",
        card: "Single",
        req: false,
        src: "Buyer + confirm",
        vals: "Hot Foil Stamping, Cold Foiling, Edge Foiling / Gilt Edging",
        def: "—",
        cond: `List depends on Materials.<ul class="sub">
      <li>Foam materials can only be compatible with foiling when Flocking / Paper Lamination / Leather Lamination is chosen.</li>
    </ul>`,
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
        type: "List",
        card: "Multi",
        req: false,
        src: "Buyer + confirm",
        vals: "Blind Embossing, Blind Debossing, Registered Embossing, etc.",
        def: "—",
        cond: `List depends on Materials.<ul class="sub">
      <li>Foam materials can only be compatible with embossing/debossing when Paper Lamination / Leather Lamination is chosen.</li>
      <li>All debossing options not compatible with Soft Touch surface finish.</li>
      <li>“Textured Embossing &amp; Debossing” incompatible with all other embossing &amp; debossing options.</li>
      <li>“Textured Embossing &amp; Debossing” is only compatible with the “Uncoated” surface finish.</li>
    </ul>`,
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
        type: "List",
        card: "Single",
        req: false,
        src: "Buyer + confirm",
        vals: "Food-Grade Material, Internal PE Lining, Internal Aqueous Lining, Wax Coating, Food-Grade Lacquer",
        def: "—",
        cond: "List depends on Product Line/Style.",
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
        type: "List",
        card: "Single",
        req: false,
        src: "Buyer + confirm",
        vals: "Twisted Paper Handle, Flat Paper Handle, Diecut Handle, Satin Ribbon Handle, etc.",
        def: "—",
        cond: "List depends on Product Style.",
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
        type: "List",
        card: "Multi",
        req: false,
        src: "Buyer + confirm",
        vals: "Ribbon Pull Tabs, Plastic Knob, Thumb Notch, Tear Strip, etc.",
        def: "—",
        cond: "List depends on Product Style.",
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
        type: "List",
        card: "Multi",
        req: false,
        src: "Buyer + confirm",
        vals: "Velcro, Magnetic Closure, Standard Zipper, Tin Tie, etc.",
        def: "—",
        cond: "List depends on Product Style.",
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
        type: "List",
        card: "Single",
        req: false,
        src: "Buyer + confirm",
        vals: "Window Patching, Diecut Window, Pouch Window",
        def: "—",
        cond: "List depends on Product Style.",
        ui: {
          kind: "listbox",
          value: "",
          choices: ["Window Patching", "Diecut Window", "Pouch Window"],
        },
      },
      {
        n: "Reinforcement & Utility",
        type: "List",
        card: "Multi",
        req: false,
        src: "Buyer + confirm",
        vals: "Paper Wallet, Sleeve Pocket, Bubble Lining, Hang Hole, etc.",
        def: "—",
        cond: "List depends on Product Style.",
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
        type: "List",
        card: "Multi",
        req: false,
        src: "Buyer + confirm",
        vals: "Metal Plaque, Mirror, Embedded LED Lighting, Sound Module",
        def: "—",
        cond: "List depends on Product Style.",
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
        type: "Link out",
        card: "Single",
        req: false,
        src: "Buyer",
        vals: "Reference links",
        def: "—",
        cond: "Demo control — Property / Property Value presentation; not a live mapping rule.",
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
