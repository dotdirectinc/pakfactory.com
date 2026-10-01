"use client";

import { useMemo, useState } from "react";
import { Input } from "@pakfactory/ui/components/input";
import type { BrowseProperty } from "@/lib/spec/catalog-browse";
import { ADMIN_SPEC_BROWSE_COPY as COPY } from "@/lib/copy/spec";

const matches = (q: string, title: string, code?: string) =>
  title.toLowerCase().includes(q) || (code ?? "").toLowerCase().includes(q);

/**
 * Every property with its values: where each is declared (type and usage), and how many options
 * and products state it. A property that matches keeps all its values; otherwise only the
 * matching values show.
 */
export function SpecPropertyList({ properties }: { properties: BrowseProperty[] }) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();

  const filtered = useMemo(() => {
    if (!q) return properties;
    return properties
      .map((p) =>
        matches(q, p.title, p.registry?.entityCode)
          ? p
          : { ...p, values: p.values.filter((v) => matches(q, v.title, v.registry?.entityCode)) },
      )
      .filter((p) => p.values.length > 0 || matches(q, p.title, p.registry?.entityCode));
  }, [properties, q]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={COPY.filterProperties}
          className="max-w-sm"
          aria-label="Filter properties"
        />
        <span className="text-sm tabular-nums text-muted-foreground">
          {q ? `${filtered.length} of ${properties.length}` : COPY.propertiesCount(properties.length)}
        </span>
      </div>
      {filtered.length === 0 ? (
        <p className="rounded-md border border-border p-4 text-sm text-muted-foreground">{COPY.noMatch(query)}</p>
      ) : (
        filtered.map((p) => (
          <details key={p.id} open={Boolean(q)} className="rounded-md border border-border">
            <summary className="flex cursor-pointer flex-wrap items-baseline justify-between gap-2 bg-muted/40 px-3 py-2 text-sm">
              <span className="flex flex-wrap items-baseline gap-2">
                <span className="font-semibold text-foreground">{p.title}</span>
                <Code value={p.registry?.entityCode} />
              </span>
              <span className="text-xs tabular-nums text-muted-foreground">
                {COPY.valuesCount(p.values.length)} · {COPY.declaredOnTypes(p.declaredOn.length)} ·{" "}
                {COPY.onProducts(p.products)}
              </span>
            </summary>
            {p.declaredOn.length > 0 && (
              <p className="border-b border-border px-3 py-1.5 text-xs text-muted-foreground">
                {COPY.declaredOn}{" "}
                {p.declaredOn.map((d, i) => (
                  <span key={`${d.type}-${i}`}>
                    {i > 0 && ", "}
                    <span className="text-foreground">{d.type}</span> ({COPY.usage(d.usage)})
                  </span>
                ))}
              </p>
            )}
            {p.values.length === 0 ? (
              <p className="px-3 py-2 text-sm text-muted-foreground">{COPY.noValues}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[40rem] text-sm">
                  <thead className="text-left text-xs text-muted-foreground">
                    <tr>
                      <th className="px-3 py-1.5 font-medium">{COPY.columns.value}</th>
                      <th className="px-3 py-1.5 font-medium">{COPY.columns.code}</th>
                      <th className="px-3 py-1.5 font-medium">{COPY.columns.facts}</th>
                      <th className="px-3 py-1.5 text-right font-medium">{COPY.columns.options}</th>
                      <th className="px-3 py-1.5 text-right font-medium">{COPY.columns.products}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {p.values.map((v) => (
                      <tr key={v.id} className="border-t border-border">
                        <td className="px-3 py-1.5 text-foreground">
                          {v.title}
                          {v.kindOf && <span className="ml-2 text-xs text-muted-foreground">{COPY.kindOf(v.kindOf)}</span>}
                        </td>
                        <td className="whitespace-nowrap px-3 py-1.5">
                          <Code value={v.registry?.entityCode} />
                        </td>
                        <td className="px-3 py-1.5 text-xs text-muted-foreground">
                          {v.facts.length ? v.facts.map((f) => `${f.label}: ${f.value}`).join(" · ") : "—"}
                        </td>
                        <td className="px-3 py-1.5 text-right tabular-nums">{v.options || "—"}</td>
                        <td className="px-3 py-1.5 text-right tabular-nums">{v.products || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </details>
        ))
      )}
    </div>
  );
}

function Code({ value }: { value?: string }) {
  return value ? (
    <code className="font-mono text-xs font-normal text-muted-foreground">{value}</code>
  ) : (
    <span className="text-xs font-normal text-muted-foreground">{COPY.notRegistered}</span>
  );
}
