"use client";

import { useMemo, useState } from "react";
import { buildCompatibilityIndex } from "@pakfactory/sanity/customization-rules";
import { buildDependencyGraph } from "@pakfactory/sanity/customization-rules/dependencies";
import {
  resolveWithSelections,
  type Selections,
} from "@pakfactory/sanity/customization-rules/selections";
import { PropertyController } from "@pakfactory/ui/components/customization/property-controller/property-controller";
import type { UiDescriptor } from "@pakfactory/ui/components/customization/types";
import { Button } from "@pakfactory/ui/components/button";
import { cn } from "@pakfactory/ui/lib/utils";
import type { ConfiguratorSnapshot } from "@/lib/spec/product-view";
import { ADMIN_SPEC_PRODUCTS_COPY as COPY } from "@/lib/copy/spec";

/**
 * Configure the product the way a customer does, with the reasons a customer never sees
 * (PROD-2614). Read-only: nothing here is saved.
 *
 * Runs `resolveWithSelections` with `lookahead` — the exact call the storefront builder makes
 * — so an option offered here is an option the customer can pick on the PDP, and one that
 * disappears disappears there too. Reference options are left out, as the storefront leaves
 * them out.
 */
export function ProductConfigurator({
  snapshot,
  categoryOrder,
  dimensions,
}: {
  snapshot: ConfiguratorSnapshot;
  categoryOrder: string[];
  dimensions: UiDescriptor | null;
}) {
  const prepared = useMemo(() => {
    const catalog = { types: snapshot.types, options: snapshot.options };
    return {
      catalog,
      graph: buildDependencyGraph(catalog),
      index: buildCompatibilityIndex(snapshot.options),
      reference: new Set(snapshot.reference),
    };
  }, [snapshot]);

  const [selections, setSelections] = useState<Selections>({});

  const { pickable, offered, invalidated } = useMemo(() => {
    const args = [prepared.catalog, snapshot.product, prepared.graph, selections, prepared.index] as const;
    const withLookahead = resolveWithSelections(...args, { lookahead: true });
    const plain = resolveWithSelections(...args);
    return {
      pickable: withLookahead.availableByType,
      offered: plain.availableByType,
      invalidated: withLookahead.invalidated,
    };
  }, [prepared, snapshot.product, selections]);

  const title = (token: string) => snapshot.titles[token] ?? token;
  const picked = (typeId: string) => new Set(selections[typeId] ?? []);

  const toggle = (typeId: string, token: string, many: boolean) =>
    setSelections((prev) => {
      const current = prev[typeId] ?? [];
      const next = current.includes(token)
        ? current.filter((t) => t !== token)
        : many
          ? [...current, token]
          : [token];
      const out = { ...prev, [typeId]: next };
      if (next.length === 0) delete out[typeId];
      return out;
    });

  const sections = useMemo(() => {
    const byCategory = new Map<string, typeof snapshot.types>();
    for (const type of snapshot.types) {
      const offeredHere = (offered.get(type._id) ?? []).filter((t) => !prepared.reference.has(t));
      if (offeredHere.length === 0 && !(selections[type._id]?.length)) continue;
      byCategory.set(type.categoryTitle, [...(byCategory.get(type.categoryTitle) ?? []), type]);
    }
    const rank = (c: string) => {
      const i = categoryOrder.indexOf(c);
      return i === -1 ? categoryOrder.length : i;
    };
    return [...byCategory].sort(([a], [b]) => rank(a) - rank(b) || a.localeCompare(b));
  }, [snapshot.types, offered, prepared.reference, selections, categoryOrder]);

  const pickCount = Object.values(selections).reduce((n, ids) => n + ids.length, 0);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="max-w-2xl text-sm text-muted-foreground">{COPY.configureLead}</p>
        <Button variant="outline" size="sm" onClick={() => setSelections({})} disabled={pickCount === 0}>
          {COPY.reset}
        </Button>
      </div>

      {invalidated.length > 0 && (
        <p role="status" className="rounded-md border border-border bg-muted/30 p-3 text-sm text-destructive">
          {COPY.invalidated(invalidated.map((i) => title(i.optionId)).join(", "))}
        </p>
      )}

      {dimensions && (
        <section className="rounded-md border border-border p-3">
          <h2 className="mb-2 text-sm font-semibold text-foreground">{COPY.dimensions}</h2>
          <PropertyController ui={dimensions} />
        </section>
      )}

      {sections.map(([category, types]) => (
        <section key={category} className="rounded-md border border-border">
          <h2 className="border-b border-border bg-muted/40 px-3 py-2 text-sm font-semibold text-foreground">
            {category}
          </h2>
          <div className="divide-y divide-border">
            {types.map((type) => {
              const many = type.customerSelects === "many";
              const can = new Set(pickable.get(type._id) ?? []);
              const mine = picked(type._id);
              const shown = (offered.get(type._id) ?? []).filter((t) => !prepared.reference.has(t));
              const hidden = shown.filter((t) => !can.has(t) && !mine.has(t));
              return (
                <div key={type._id} className="flex flex-col gap-2 px-3 py-2">
                  <div className="flex items-baseline justify-between gap-2 text-sm">
                    <span className="font-medium text-foreground">{type.title}</span>
                    <span className="text-xs text-muted-foreground">
                      {many ? COPY.pickSeveral : COPY.pickOne}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {shown
                      .filter((t) => can.has(t) || mine.has(t))
                      .map((t) => (
                        <button
                          key={t}
                          type="button"
                          aria-pressed={mine.has(t)}
                          onClick={() => toggle(type._id, t, many)}
                          className={cn(
                            "rounded-full border px-3 py-1 text-xs transition-colors",
                            mine.has(t)
                              ? "border-foreground bg-foreground text-background"
                              : "border-border bg-background text-foreground hover:bg-muted",
                          )}
                        >
                          {title(t)}
                        </button>
                      ))}
                  </div>
                  {hidden.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {COPY.hiddenByPicks(hidden.map(title).join(", "))}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
