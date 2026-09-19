/**
 * Shared property-controller types (customer www + admin).
 * Props-only — no Sanity, fixtures, or sandbox state.
 */

import type {AxisRange} from "@pakfactory/utilities/length-units";
import type {DimensionFieldAxis} from "@pakfactory/utilities/dimension-axes";
import {DEFAULT_DIMENSION_AXES} from "@pakfactory/utilities/dimension-axes";

export type {DimensionFieldAxis, AxisRange};
export {DEFAULT_DIMENSION_AXES};

export type UiKind =
  | "readonly"
  | "dimension"
  | "radio"
  | "radioPick"
  | "toggles"
  | "listbox"
  | "stepper"
  | "repeat"
  | "select"
  | "checks"
  | "textUpload"
  | "swatch"
  | "specTable"
  | "cardGrid"
  | "linkOut"
  | "chip";

export type ToggleItem = {
  label: string;
  value: boolean;
};

export type SwatchItem = {
  id: string;
  label: string;
  color?: string;
  imageUrl?: string;
  /** Empty dotted circle (e.g. Need consultation); no fill/image. */
  appearance?: "swatch" | "consultation";
};

export type SpecSegment = {
  id: string;
  label: string;
};

export type CardItem = {
  id: string;
  name: string;
  meta?: string;
};

export type LinkItem = {
  label: string;
  href: string;
};

export type ChipItem = {
  id: string;
  label: string;
};

export type ValuesPerItem = "one" | "many";

/** Controlled value for `dimension` — `unsure` is a valid Ready selection. */
export type DimensionFieldValue = {
  unsure: boolean;
  /** Axis id → numeric string (empty when blank). */
  values: Record<string, string>;
};

/**
 * Controlled value bag for PropertyController.
 * Omitted → field uses internal / defaultValue (admin demo).
 */
export type PropertyControllerValue =
  | {kind: "dimension"; value: DimensionFieldValue}
  | {kind: "radio"; value: string}
  | {kind: "radioPick"; value: string}
  | {kind: "toggles"; value: boolean[]}
  | {kind: "listbox"; value: string[]}
  | {kind: "stepper"; value: number}
  | {kind: "repeat"; value: string[]}
  | {kind: "select"; value: string}
  | {kind: "checks"; value: string[]}
  | {kind: "textUpload"; value: string}
  | {kind: "swatch"; value: string}
  | {kind: "specTable"; value: string}
  | {kind: "cardGrid"; value: string}
  | {kind: "chip"; value: string[]};

export type UiDescriptor =
  | {kind: "readonly"; value: string}
  | {
      kind: "dimension";
      unit: string;
      axes?: DimensionFieldAxis[];
      /** Per-axis min/max already in `unit` (from utilities convert). */
      ranges?: Partial<Record<string, AxisRange>> | null;
    }
  | {kind: "radio"; choices: string[]; value: string}
  | {
      kind: "radioPick";
      choices: string[];
      value: string;
      pick: string[];
      unit?: string;
    }
  | {kind: "toggles"; items: ToggleItem[]; hint?: string}
  | {
      kind: "listbox";
      choices: string[];
      value?: string;
      values?: string[];
      multi?: boolean;
      exclusive?: string;
      hint?: string;
    }
  | {kind: "stepper"; value: number; max?: number}
  | {kind: "repeat"; placeholder: string}
  | {kind: "select"; choices: string[]}
  | {kind: "checks"; choices: string[]}
  | {kind: "textUpload"; placeholder: string}
  | {kind: "swatch"; swatches: SwatchItem[]; value?: string}
  | {
      kind: "specTable";
      segments: SpecSegment[];
      columns: string[];
      rows: Record<string, string[]>;
    }
  | {kind: "cardGrid"; cards: CardItem[]; value?: string}
  | {kind: "linkOut"; links: LinkItem[]}
  | {
      kind: "chip";
      chips: ChipItem[];
      valuesPerItem?: ValuesPerItem;
      values?: string[];
    };
