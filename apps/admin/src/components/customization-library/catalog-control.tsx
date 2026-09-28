"use client";

import {PropertyController} from "@pakfactory/ui/components/customization/property-controller/property-controller";
import type {UiDescriptor} from "@pakfactory/ui/components/customization/types";

type CatalogControlProps = {
  ui: UiDescriptor;
  /** Stable id for radio groups / repeat hosts (local only). */
  controlId: string;
};

/**
 * Admin Property Controls dispatcher — thin wrapper over shared
 * `@pakfactory/ui` PropertyController (uncontrolled / demo defaults).
 */
export function CatalogControl({ui, controlId}: CatalogControlProps) {
  return <PropertyController ui={ui} controlId={controlId} />;
}
