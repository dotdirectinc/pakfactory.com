"use client";

import Link from "next/link";
import { Badge } from "@pakfactory/ui/components/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@pakfactory/ui/components/tabs";
import { cn } from "@pakfactory/ui/lib/utils";
import type { ProductTypeBlock, ProductView } from "@/lib/spec/product-view";
import { ProductConfigurator } from "./product-configurator";
import { ADMIN_SPEC_PRODUCTS_COPY as COPY } from "@/lib/copy/spec";

/** One product: what it offers and why, configuring it as a customer, and its exceptions. */
export function SpecProductDetail({ view }: { view: ProductView }) {
  return (
    <Tabs defaultValue="offers">
      <TabsList>
        <TabsTrigger value="offers">{COPY.tabs.offers}</TabsTrigger>
        <TabsTrigger value="configure">{COPY.tabs.configure}</TabsTrigger>
        <TabsTrigger value="exceptions">
          {COPY.tabs.exceptions} ({view.exceptions.length})
        </TabsTrigger>
      </TabsList>

      <TabsContent value="offers" className="mt-3 flex flex-col gap-3">
        <p className="text-sm text-muted-foreground">
          <span className="font-semibold tabular-nums text-foreground">{view.counts.listed}</span> listed ·{" "}
          <span className="font-semibold tabular-nums text-foreground">{view.counts.derived}</span> derived
          {view.counts.added > 0 && (
            <>
              {" "}· <span className="font-semibold tabular-nums text-foreground">{view.counts.added}</span> added by exception
            </>
          )}
        </p>
        <p className="max-w-2xl text-sm text-muted-foreground">{COPY.offersLead}</p>
        {view.categories.map((category) => (
          <section key={category.title} className="rounded-md border border-border">
            <h2 className="border-b border-border bg-muted/40 px-3 py-2 text-sm font-semibold text-foreground">
              {category.title}
            </h2>
            <div className="divide-y divide-border">
              {category.types.map((type) => (
                <TypeBlock key={type.typeId} type={type} />
              ))}
            </div>
          </section>
        ))}
      </TabsContent>

      <TabsContent value="configure" className="mt-3">
        <ProductConfigurator
          product={view.configurator}
          categoryOrder={view.categories.map((c) => c.title)}
          dimensions={view.dimensions}
        />
      </TabsContent>

      <TabsContent value="exceptions" className="mt-3">
        {view.exceptions.length === 0 ? (
          <p className="rounded-md border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
            {COPY.exceptionsEmpty}
          </p>
        ) : (
          <ul className="divide-y divide-border rounded-md border border-border text-sm">
            {view.exceptions.map((e, i) => (
              <li key={i} className="flex flex-col gap-0.5 px-3 py-2">
                <span className="font-medium text-foreground">
                  {e.mode === "add" ? "Add" : "Remove"} {e.optionTitle}
                  <span
                    className={cn(
                      "ml-2 text-xs",
                      e.effect === "added" || e.effect === "removed" ? "text-muted-foreground" : "text-destructive",
                    )}
                  >
                    {e.effect}
                  </span>
                </span>
                {e.reason && <span className="text-muted-foreground">{e.reason}</span>}
                {e.rulesSaid && <span className="text-xs text-muted-foreground">Rules alone: {e.rulesSaid}</span>}
              </li>
            ))}
          </ul>
        )}
      </TabsContent>
    </Tabs>
  );
}

function TypeBlock({ type }: { type: ProductTypeBlock }) {
  return (
    <div className="flex flex-col gap-1.5 px-3 py-2 text-sm">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="font-medium text-foreground">{type.title}</span>
        <span className="text-xs text-muted-foreground">
          {type.decidedBy === "product" ? "decided by the product" : "decided by the rules"}
          {type.customerSelects === "many" ? " · pick several" : ""}
        </span>
      </div>
      {type.unconstrained && <p className="text-xs text-muted-foreground">{COPY.unconstrained}</p>}
      <ul className="flex flex-col gap-0.5">
        {type.options.map((o) => (
          <li key={o.id} className="flex flex-wrap items-baseline gap-x-2">
            <Link href={`/spec/customizations/${encodeURIComponent(o.id)}`} className="text-foreground hover:underline">
              {o.title}
            </Link>
            {o.state !== "derived" && <Badge variant="secondary">{COPY.state[o.state]}</Badge>}
            {o.reference && <span className="text-xs text-muted-foreground">({COPY.referenceNote})</span>}
            {o.because.length > 0 && (
              <span className="text-xs text-muted-foreground">
                {COPY.because}{" "}
                {o.because
                  .map((b) => `${b.typeTitle}: ${b.partners.slice(0, 3).join(", ")}${b.partners.length > 3 ? ` +${b.partners.length - 3}` : ""}`)
                  .join(" · ")}
              </span>
            )}
          </li>
        ))}
      </ul>
      {type.removed.length > 0 && (
        <details className="text-xs text-muted-foreground">
          <summary className="cursor-pointer">{COPY.removedHeading(type.removed.length)}</summary>
          <ul className="mt-1 flex flex-col gap-0.5 pl-3">
            {type.removed.map((r) => (
              <li key={r.id}>
                {r.title} — {r.byException ? COPY.removedByException : COPY.removedBecause(r.unsatisfied.join(", "))}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
