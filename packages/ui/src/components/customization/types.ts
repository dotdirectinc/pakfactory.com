/**
 * Shared property-controller types (customer www + admin).
 * Props-only — no Sanity, fixtures, or sandbox state.
 */

export type UiKind =
  | "readonly"
  | "dims"
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

export type UiDescriptor =
  | { kind: "readonly"; value: string }
  | { kind: "dims"; unit: string }
  | { kind: "radio"; choices: string[]; value: string }
  | {
      kind: "radioPick";
      choices: string[];
      value: string;
      pick: string[];
      unit?: string;
    }
  | { kind: "toggles"; items: ToggleItem[]; hint?: string }
  | {
      kind: "listbox";
      choices: string[];
      value?: string;
      values?: string[];
      multi?: boolean;
      exclusive?: string;
      hint?: string;
    }
  | { kind: "stepper"; value: number; max?: number }
  | { kind: "repeat"; placeholder: string }
  | { kind: "select"; choices: string[] }
  | { kind: "checks"; choices: string[] }
  | { kind: "textUpload"; placeholder: string }
  | { kind: "swatch"; swatches: SwatchItem[]; value?: string }
  | {
      kind: "specTable";
      segments: SpecSegment[];
      columns: string[];
      rows: Record<string, string[]>;
    }
  | { kind: "cardGrid"; cards: CardItem[]; value?: string }
  | { kind: "linkOut"; links: LinkItem[] }
  | {
      kind: "chip";
      chips: ChipItem[];
      valuesPerItem?: ValuesPerItem;
      values?: string[];
    };
