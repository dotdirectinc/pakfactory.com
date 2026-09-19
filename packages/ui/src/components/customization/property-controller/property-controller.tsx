"use client";

import type {
  PropertyControllerValue,
  UiDescriptor,
} from "../types";
import {CardGridField} from "./card-grid-field";
import {ChecksField} from "./checks-field";
import {ChipField} from "./chip-field";
import {DimensionField} from "./dimension-field";
import {LinkOutField} from "./link-out-field";
import {ListboxField} from "./listbox-field";
import {RadioField} from "./radio-field";
import {RadioPickField} from "./radio-pick-field";
import {ReadonlyField} from "./readonly-field";
import {RepeatField} from "./repeat-field";
import {SelectField} from "./select-field";
import {SpecTableField} from "./spec-table-field";
import {StepperField} from "./stepper-field";
import {SwatchField} from "./swatch-field";
import {TextUploadField} from "./text-upload-field";
import {TogglesField} from "./toggles-field";

export type PropertyControllerProps = {
  ui: UiDescriptor;
  /** Stable id for radio groups / repeat hosts (optional). */
  controlId?: string;
  /**
   * Controlled value matching `ui.kind`. Omit for uncontrolled / defaultValue
   * demo mode (admin Property Controls explorer).
   */
  value?: PropertyControllerValue;
  onChange?: (next: PropertyControllerValue) => void;
};

function asKind<K extends PropertyControllerValue["kind"]>(
  value: PropertyControllerValue | undefined,
  kind: K,
): Extract<PropertyControllerValue, {kind: K}> | undefined {
  if (value?.kind === kind) {
    return value as Extract<PropertyControllerValue, {kind: K}>;
  }
  return undefined;
}

/**
 * Props-only dispatcher: `UiDescriptor` → property-controller field.
 * Shared by admin Property Controls and www customize surfaces.
 */
export function PropertyController({
  ui,
  controlId: _controlId,
  value,
  onChange,
}: PropertyControllerProps) {
  void _controlId;

  switch (ui.kind) {
    case "readonly":
      return <ReadonlyField value={ui.value} />;
    case "dimension": {
      const controlled = asKind(value, "dimension");
      return (
        <DimensionField
          unit={ui.unit}
          axes={ui.axes}
          ranges={ui.ranges}
          value={controlled?.value}
          onChange={
            onChange
              ? (next) => onChange({kind: "dimension", value: next})
              : undefined
          }
        />
      );
    }
    case "radio": {
      const controlled = asKind(value, "radio");
      return (
        <RadioField
          choices={ui.choices}
          value={controlled?.value}
          defaultValue={ui.value}
          onChange={
            onChange
              ? (next) => onChange({kind: "radio", value: next})
              : undefined
          }
        />
      );
    }
    case "radioPick": {
      const controlled = asKind(value, "radioPick");
      return (
        <RadioPickField
          choices={ui.choices}
          pick={ui.pick}
          unit={ui.unit || "in"}
          value={controlled?.value}
          defaultValue={ui.value}
          onChange={
            onChange
              ? (next) => onChange({kind: "radioPick", value: next})
              : undefined
          }
        />
      );
    }
    case "toggles": {
      const controlled = asKind(value, "toggles");
      return (
        <TogglesField
          items={ui.items}
          hint={ui.hint}
          value={controlled?.value}
          onChange={
            onChange
              ? (next) => onChange({kind: "toggles", value: next})
              : undefined
          }
        />
      );
    }
    case "listbox": {
      const controlled = asKind(value, "listbox");
      return (
        <ListboxField
          choices={ui.choices}
          multi={ui.multi}
          exclusive={ui.exclusive}
          value={controlled?.value}
          defaultValue={ui.value}
          defaultValues={ui.values}
          hint={ui.hint}
          onChange={
            onChange
              ? (next) => onChange({kind: "listbox", value: next})
              : undefined
          }
        />
      );
    }
    case "stepper": {
      const controlled = asKind(value, "stepper");
      return (
        <StepperField
          value={controlled?.value}
          defaultValue={ui.value}
          max={ui.max ?? 99}
          onChange={
            onChange
              ? (next) => onChange({kind: "stepper", value: next})
              : undefined
          }
        />
      );
    }
    case "repeat": {
      const controlled = asKind(value, "repeat");
      return (
        <RepeatField
          placeholder={ui.placeholder}
          value={controlled?.value}
          onChange={
            onChange
              ? (next) => onChange({kind: "repeat", value: next})
              : undefined
          }
        />
      );
    }
    case "select": {
      const controlled = asKind(value, "select");
      return (
        <SelectField
          choices={ui.choices}
          value={controlled?.value}
          onChange={
            onChange
              ? (next) => onChange({kind: "select", value: next})
              : undefined
          }
        />
      );
    }
    case "checks": {
      const controlled = asKind(value, "checks");
      return (
        <ChecksField
          choices={ui.choices}
          value={controlled?.value}
          onChange={
            onChange
              ? (next) => onChange({kind: "checks", value: next})
              : undefined
          }
        />
      );
    }
    case "textUpload": {
      const controlled = asKind(value, "textUpload");
      return (
        <TextUploadField
          placeholder={ui.placeholder}
          value={controlled?.value}
          onChange={
            onChange
              ? (next) => onChange({kind: "textUpload", value: next})
              : undefined
          }
        />
      );
    }
    case "swatch": {
      const controlled = asKind(value, "swatch");
      return (
        <SwatchField
          swatches={ui.swatches}
          value={controlled?.value}
          defaultValue={ui.value}
          onChange={
            onChange
              ? (next) => onChange({kind: "swatch", value: next})
              : undefined
          }
        />
      );
    }
    case "specTable": {
      const controlled = asKind(value, "specTable");
      return (
        <SpecTableField
          segments={ui.segments}
          columns={ui.columns}
          rows={ui.rows}
          value={controlled?.value}
          onChange={
            onChange
              ? (next) => onChange({kind: "specTable", value: next})
              : undefined
          }
        />
      );
    }
    case "cardGrid": {
      const controlled = asKind(value, "cardGrid");
      return (
        <CardGridField
          cards={ui.cards}
          value={controlled?.value}
          defaultValue={ui.value}
          onChange={
            onChange
              ? (next) => onChange({kind: "cardGrid", value: next})
              : undefined
          }
        />
      );
    }
    case "linkOut":
      return <LinkOutField links={ui.links} />;
    case "chip": {
      const controlled = asKind(value, "chip");
      return (
        <ChipField
          chips={ui.chips}
          valuesPerItem={ui.valuesPerItem ?? "one"}
          value={controlled?.value}
          defaultValue={ui.values}
          onChange={
            onChange
              ? (next) => onChange({kind: "chip", value: next})
              : undefined
          }
        />
      );
    }
    default:
      return null;
  }
}
