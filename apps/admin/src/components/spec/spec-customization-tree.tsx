"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Input } from "@pakfactory/ui/components/input";
import { cn } from "@pakfactory/ui/lib/utils";
import type { BrowseCategory, BrowseType } from "@/lib/spec/catalog-browse";
import { ADMIN_SPEC_BROWSE_COPY as COPY } from "@/lib/copy/spec";

const matches = (q: string, title: string, code?: string) =>
  title.toLowerCase().includes(q) || (code ?? "").toLowerCase().includes(q);

/**
 * Every category, its types and their options. Types are collapsed; a search opens whatever it
 * narrows. A type that matches keeps all its options; otherwise only the matching options show.
 */
export function SpecCustomizationTree({ categories }: { categories: BrowseCategory[] }) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();

  const filtered = useMemo(() => {
    if (!q) return categories;
    return categories
      .map((c) => {
        if (matches(q, c.title, c.registry?.entityCode)) return c;
        const types = c.types
          .map((t) =>
            matches(q, t.title, t.registry?.entityCode)
              ? t
              : { ...t, options: t.options.filter((o) => matches(q, o.title, o.registry?.entityCode)) },
          )
          .filter((t) => t.options.length > 0 || matches(q, t.title, t.registry?.entityCode));
        return { ...c, types };
      })
      .filter((c) => c.types.length > 0 || matches(q, c.title, c.registry?.entityCode));
  }, [categories, q]);

  const shown = filtered.reduce((n, c) => n + c.types.reduce((m, t) => m + t.options.length, 0), 0);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={COPY.filterCustomizations}
          className="max-w-sm"
          aria-label="Filter customizations"
        />
        {q && <span className="text-sm tabular-nums text-muted-foreground">{COPY.optionsShown(shown)}</span>}
      </div>
      {filtered.length === 0 ? (
        <p className="rounded-md border border-border p-4 text-sm text-muted-foreground">{COPY.noMatch(query)}</p>
      ) : (
        filtered.map((c) => (
          <section key={c.id || "none"} className="flex flex-col gap-2">
            <h2 className="flex flex-wrap items-baseline gap-2 text-base font-semibold text-foreground">
              {c.title}
              <Code value={c.registry?.entityCode} />
              <span className="text-xs font-normal text-muted-foreground">{COPY.typesCount(c.types.length)}</span>
            </h2>
            {c.types.map((t) => (
              <TypeBlock key={t.id} type={t} open={Boolean(q)} />
            ))}
          </section>
        ))
      )}
    </div>
  );
}

function TypeBlock({ type: t, open }: { type: BrowseType; open: boolean }) {
  return (
    <details open={open} className="rounded-md border border-border">
      <summary className="flex cursor-pointer flex-wrap items-baseline justify-between gap-2 bg-muted/40 px-3 py-2 text-sm">
        <span className="flex flex-wrap items-baseline gap-2">
          <span className="font-semibold text-foreground">{t.title}</span>
          <Code value={t.registry?.entityCode} />
        </span>
        <span className="text-xs tabular-nums text-muted-foreground">
          {COPY.optionsCount(t.options.length)}
          {t.decidedBy && ` · ${COPY.decidedBy(t.decidedBy)}`}
          {t.customerSelects && ` · ${COPY.selects(t.customerSelects)}`}
          {` · ${COPY.declaredProperties(t.declaredProperties)}`}
        </span>
      </summary>
      {t.studioUrl && (
        <p className="border-b border-border px-3 py-1.5 text-xs">
          <a href={t.studioUrl} target="_blank" rel="noreferrer" className="text-muted-foreground hover:underline">
            {COPY.editTypeInStudio} ↗
          </a>
        </p>
      )}
      {t.options.length === 0 ? (
        <p className="px-3 py-2 text-sm text-muted-foreground">{COPY.noOptions}</p>
      ) : (
        <ul className="divide-y divide-border text-sm">
          {t.options.map((o) => (
            <li key={o.id} className="flex flex-wrap items-baseline justify-between gap-2 px-3 py-1.5">
              <span className="flex flex-wrap items-baseline gap-2">
                {o.hasRulesPage ? (
                  <Link href={`/spec/customizations/${encodeURIComponent(o.id)}`} className="text-foreground hover:underline">
                    {o.title}
                  </Link>
                ) : (
                  <span className="text-muted-foreground">{o.title}</span>
                )}
                <Code value={o.registry?.entityCode} />
              </span>
              <span className="text-xs tabular-nums text-muted-foreground">
                <span className={cn(o.status !== "active" && "text-destructive")}>{COPY.status(o.status)}</span>
                {` · ${COPY.valuesCount(o.valueCount)}`}
              </span>
            </li>
          ))}
        </ul>
      )}
    </details>
  );
}

function Code({ value }: { value?: string }) {
  return value ? (
    <code className="font-mono text-xs font-normal text-muted-foreground">{value}</code>
  ) : (
    <span className="text-xs font-normal text-muted-foreground">{COPY.notRegistered}</span>
  );
}
