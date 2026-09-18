"use client";

import {useState} from "react";
import {Badge} from "@pakfactory/ui/components/badge";
import {PropertyFieldPanel} from "@pakfactory/ui/components/customization/property-controller/property-field-panel";
import {SwatchField} from "@pakfactory/ui/components/customization/property-controller/swatch-field";
import {TooltipProvider} from "@pakfactory/ui/components/tooltip";
import {cn} from "@pakfactory/ui/lib/utils";
import type {UiDescriptor} from "@pakfactory/ui/components/customization/types";
import {
  CATS,
  type CatalogOption,
  type Category,
} from "@/lib/customization/catalog-data";
import {CatalogControl} from "./catalog-control";

function SwatchCatalogPreview({
  baseTitle,
  ui,
}: {
  baseTitle: string;
  ui: Extract<UiDescriptor, {kind: "swatch"}>;
}) {
  const [value, setValue] = useState(
    ui.value ?? ui.swatches[0]?.id ?? "",
  );
  const selectedLabel =
    ui.swatches.find((s) => s.id === value)?.label ?? undefined;
  const panelTitle = selectedLabel
    ? `${baseTitle}: ${selectedLabel}`
    : baseTitle;

  return (
    <PropertyFieldPanel title={panelTitle}>
      <SwatchField
        swatches={ui.swatches}
        value={value}
        onChange={setValue}
        defaultValue={ui.value}
      />
    </PropertyFieldPanel>
  );
}

function CatalogPreview({
  baseTitle,
  ui,
  controlId,
}: {
  baseTitle: string;
  ui: UiDescriptor;
  controlId: string;
}) {
  if (ui.kind === "swatch") {
    return <SwatchCatalogPreview baseTitle={baseTitle} ui={ui} />;
  }

  return (
    <PropertyFieldPanel title={baseTitle}>
      <CatalogControl ui={ui} controlId={controlId} />
    </PropertyFieldPanel>
  );
}

function OptionCard({
  option,
  controlId,
}: {
  option: CatalogOption;
  controlId: string;
}) {
  const isMulti =
    option.card === "Multi" || option.card.toLowerCase().includes("multi");
  const previewTitle = option.uiCap ?? option.n;
  const variantTitle = option.ui2Cap ?? `${option.n} (variant)`;

  return (
    <div className="border-b border-muted px-4 py-4 last:border-b-0">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold text-foreground">
          {option.n}
        </span>
        <Badge
          variant="secondary"
          className="bg-primary/10 text-primary hover:bg-primary/10"
        >
          {option.type}
        </Badge>
        <Badge
          variant="outline"
          className={cn(isMulti && "bg-primary/10 text-primary")}
        >
          {option.card}
        </Badge>
        {option.req ? <Badge variant="destructive">Required</Badge> : null}
        <Badge variant="outline">{option.src}</Badge>
      </div>

      <div className="mt-3 grid gap-4 md:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-3">
          <CatalogPreview
            baseTitle={previewTitle}
            ui={option.ui}
            controlId={controlId}
          />
          {option.ui2 ? (
            <CatalogPreview
              baseTitle={variantTitle}
              ui={option.ui2}
              controlId={`${controlId}-b`}
            />
          ) : null}
        </div>

        <div className="min-w-0">
          <dl className="grid grid-cols-[5rem_1fr] gap-x-2 gap-y-1 text-xs text-muted-foreground">
            <dt className="font-semibold text-muted-foreground/80">Values</dt>
            <dd dangerouslySetInnerHTML={{__html: option.vals}} />
            <dt className="font-semibold text-muted-foreground/80">Default</dt>
            <dd dangerouslySetInnerHTML={{__html: option.def}} />
          </dl>
          {option.cond ? (
            <div className="mt-2 flex items-start gap-2 rounded-[var(--radius-control)] bg-brand-cream p-2 text-xs text-foreground">
              <b className="shrink-0 font-bold text-[var(--chart-4)]">
                ▸ Condition
              </b>
              <span dangerouslySetInnerHTML={{__html: option.cond}} />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function CategoryBlock({category}: {category: Category}) {
  const [collapsed, setCollapsed] = useState(true);
  const count = category.opts.length;

  return (
    <div
      className="mb-4 overflow-hidden rounded-xl border border-border bg-card"
      data-cat={category.id}
    >
      <div
        className="flex cursor-pointer select-none items-center gap-3 bg-muted px-4 py-4"
        role="button"
        tabIndex={0}
        onClick={() => setCollapsed((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setCollapsed((v) => !v);
          }
        }}
      >
        <span className="grid size-6 shrink-0 place-items-center rounded-[var(--radius-control)] bg-primary/10 text-sm text-primary">
          {category.icon}
        </span>
        <h3 className="text-sm font-semibold text-foreground">
          {category.name}
        </h3>
        <span className="ml-auto text-xs text-muted-foreground">
          {count} option{count > 1 ? "s" : ""}
        </span>
        <span
          className={cn(
            "text-xs text-muted-foreground transition-transform",
            collapsed && "-rotate-90",
          )}
        >
          ▾
        </span>
      </div>
      {!collapsed ? (
        <div>
          {category.opts.map((opt, i) => (
            <OptionCard
              key={`${category.id}-${opt.n}`}
              option={opt}
              controlId={`${category.id}-${i}`}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function CatalogSection() {
  return (
    <TooltipProvider>
      <section id="catalog" className="pt-8">
        <div className="mb-2 flex items-baseline gap-3 border-t border-border pt-4">
          <h2 className="text-base font-semibold tracking-tight text-foreground">
            Categories &amp; options
          </h2>
        </div>
        <p className="mb-4 max-w-[74ch] text-sm text-muted-foreground">
          Grouped as the configurator would present them. Interact with each
          preview to feel the interaction. Click a category header to collapse.
          Each row is a Type panel (HTML “Option”); list choices ≈ Studio
          Options.
        </p>
        <div>
          {CATS.map((cat) => (
            <CategoryBlock key={cat.id} category={cat} />
          ))}
        </div>
      </section>
    </TooltipProvider>
  );
}
