"use client";

import { CardGridField } from "@pakfactory/ui/components/customization/property-controller/card-grid-field";
import { ChecksField } from "@pakfactory/ui/components/customization/property-controller/checks-field";
import { ChipField } from "@pakfactory/ui/components/customization/property-controller/chip-field";
import { DimsField } from "@pakfactory/ui/components/customization/property-controller/dims-field";
import { LinkOutField } from "@pakfactory/ui/components/customization/property-controller/link-out-field";
import { ListboxField } from "@pakfactory/ui/components/customization/property-controller/listbox-field";
import { RadioField } from "@pakfactory/ui/components/customization/property-controller/radio-field";
import { RadioPickField } from "@pakfactory/ui/components/customization/property-controller/radio-pick-field";
import { ReadonlyField } from "@pakfactory/ui/components/customization/property-controller/readonly-field";
import { RepeatField } from "@pakfactory/ui/components/customization/property-controller/repeat-field";
import { SelectField } from "@pakfactory/ui/components/customization/property-controller/select-field";
import { SpecTableField } from "@pakfactory/ui/components/customization/property-controller/spec-table-field";
import { StepperField } from "@pakfactory/ui/components/customization/property-controller/stepper-field";
import { SwatchField } from "@pakfactory/ui/components/customization/property-controller/swatch-field";
import { TextUploadField } from "@pakfactory/ui/components/customization/property-controller/text-upload-field";
import { TogglesField } from "@pakfactory/ui/components/customization/property-controller/toggles-field";
import type { UiDescriptor } from "@pakfactory/ui/components/customization/types";

type CatalogControlProps = {
  ui: UiDescriptor;
  /** Stable id for radio groups / repeat hosts (local only). */
  controlId: string;
};

/**
 * Thin dispatcher — shared field UI lives in @pakfactory/ui.
 * Local demo state only — does not write sandbox S.
 */
export function CatalogControl({ ui, controlId: _controlId }: CatalogControlProps) {
  void _controlId;
  switch (ui.kind) {
    case "readonly":
      return <ReadonlyField value={ui.value} />;
    case "dims":
      return <DimsField unit={ui.unit} />;
    case "radio":
      return <RadioField choices={ui.choices} defaultValue={ui.value} />;
    case "radioPick":
      return (
        <RadioPickField
          choices={ui.choices}
          defaultValue={ui.value}
          pick={ui.pick}
          unit={ui.unit || "in"}
        />
      );
    case "toggles":
      return <TogglesField items={ui.items} hint={ui.hint} />;
    case "listbox":
      return (
        <ListboxField
          choices={ui.choices}
          multi={ui.multi}
          exclusive={ui.exclusive}
          defaultValue={ui.value}
          defaultValues={ui.values}
          hint={ui.hint}
        />
      );
    case "stepper":
      return <StepperField defaultValue={ui.value} max={ui.max ?? 99} />;
    case "repeat":
      return <RepeatField placeholder={ui.placeholder} />;
    case "select":
      return <SelectField choices={ui.choices} />;
    case "checks":
      return <ChecksField choices={ui.choices} />;
    case "textUpload":
      return <TextUploadField placeholder={ui.placeholder} />;
    case "swatch":
      return <SwatchField swatches={ui.swatches} defaultValue={ui.value} />;
    case "specTable":
      return (
        <SpecTableField
          segments={ui.segments}
          columns={ui.columns}
          rows={ui.rows}
        />
      );
    case "cardGrid":
      return <CardGridField cards={ui.cards} defaultValue={ui.value} />;
    case "linkOut":
      return <LinkOutField links={ui.links} />;
    case "chip":
      return (
        <ChipField
          chips={ui.chips}
          valuesPerItem={ui.valuesPerItem ?? "one"}
          defaultValue={ui.values}
        />
      );
    default:
      return null;
  }
}
