"use client";

import { useState } from "react";
import Link from "next/link";
import { PropertyFieldPanel } from "@pakfactory/ui/components/customization/property-controller/property-field-panel";
import { SwatchField } from "@pakfactory/ui/components/customization/property-controller/swatch-field";
import { TooltipProvider } from "@pakfactory/ui/components/tooltip";
import type { UiDescriptor } from "@pakfactory/ui/components/customization/types";
import { AdminPageContainer } from "@/components/layout/admin-page-container";
import { CATS } from "@/lib/customization/control-gallery-data";
import { CatalogControl } from "./catalog-control";

/**
 * Control gallery (PROD-2614): every shared `PropertyController` kind, rendered with demo values.
 *
 * A design reference for the controls www's builder uses — not rules and not catalog data. The
 * old explorer's sandbox and rule tables were retired when the rules moved to Sanity + the shared
 * package; what a product really offers, and how it narrows as a customer picks, is in
 * Spec System → Products.
 */
type Example = { label: string; ui: UiDescriptor; id: string };

function examplesByKind(): [string, Example[]][] {
  const byKind = new Map<string, Example[]>();
  for (const cat of CATS) {
    cat.opts.forEach((opt, i) => {
      const add = (ui: UiDescriptor, label: string, suffix: string) =>
        byKind.set(ui.kind, [...(byKind.get(ui.kind) ?? []), { label, ui, id: `${cat.id}-${i}${suffix}` }]);
      add(opt.ui, opt.uiCap ?? opt.n, "");
      if (opt.ui2) add(opt.ui2, opt.ui2Cap ?? `${opt.n} (variant)`, "-b");
    });
  }
  return [...byKind].sort(([a], [b]) => a.localeCompare(b));
}

const GROUPS = examplesByKind();

function SwatchPreview({ label, ui }: { label: string; ui: Extract<UiDescriptor, { kind: "swatch" }> }) {
  const [value, setValue] = useState(ui.value ?? ui.swatches[0]?.id ?? "");
  const selected = ui.swatches.find((s) => s.id === value)?.label;
  return (
    <PropertyFieldPanel title={selected ? `${label}: ${selected}` : label}>
      <SwatchField swatches={ui.swatches} value={value} onChange={setValue} defaultValue={ui.value} />
    </PropertyFieldPanel>
  );
}

function Preview({ example }: { example: Example }) {
  if (example.ui.kind === "swatch") return <SwatchPreview label={example.label} ui={example.ui} />;
  return (
    <PropertyFieldPanel title={example.label}>
      <CatalogControl ui={example.ui} controlId={example.id} />
    </PropertyFieldPanel>
  );
}

export function ControlGallery() {
  return (
    <TooltipProvider>
      <div className="text-sm text-foreground">
        <AdminPageContainer className="flex flex-col gap-6 pb-20">
          <p className="max-w-[74ch] text-sm text-muted-foreground">
            Every control kind the configurator uses, with demo values — a design reference for the
            shared <code>PropertyController</code>, not rules. To see what a real product offers and
            configure it as a customer, open{" "}
            <Link href="/spec/catalog?group=products&level=product" className="text-foreground underline">
              Spec System → Catalog → Standard products
            </Link>
            .
          </p>
          {GROUPS.map(([kind, examples]) => (
            <section key={kind} className="flex flex-col gap-3">
              <h2 className="border-b border-border pb-1 font-mono text-sm font-semibold text-foreground">
                {kind}
                <span className="ml-2 font-sans text-xs font-normal text-muted-foreground">
                  {examples.length} example{examples.length > 1 ? "s" : ""}
                </span>
              </h2>
              <div className="grid gap-4 md:grid-cols-2">
                {examples.map((ex) => (
                  <Preview key={ex.id} example={ex} />
                ))}
              </div>
            </section>
          ))}
        </AdminPageContainer>
      </div>
    </TooltipProvider>
  );
}
