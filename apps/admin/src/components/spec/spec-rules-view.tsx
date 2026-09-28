"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Badge } from "@pakfactory/ui/components/badge";
import { Input } from "@pakfactory/ui/components/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@pakfactory/ui/components/tabs";
import { cn } from "@pakfactory/ui/lib/utils";
import type { CurrentRules, PartnerLine, RuleOptionRow, RuleTypeRow } from "@/lib/spec/current-rules";
import {
  ADMIN_SPEC_RULES_COPY as COPY,
  LEGACY_RULE_COVERAGE,
  LEGACY_STATUS_LABEL,
} from "@/lib/copy/spec";

/**
 * The current rules at three levels: per type (the statements), per option (its pairs,
 * summarised), and what needs attention. Everything shown was computed by the shared package
 * on the server; this only filters and words it.
 */
export function SpecRulesView({ rules }: { rules: CurrentRules }) {
  const attentionCount =
    rules.attention.missingReferences.length +
    rules.attention.siblingPairs.length +
    rules.attention.referencePairs.length +
    rules.attention.unknownDependencyReferences.length +
    rules.options.filter((o) => o.unmetRequirements.length > 0).length;

  return (
    <div className="flex flex-col gap-4">
      <Totals rules={rules} />
      <Tabs defaultValue="types">
        <TabsList>
          <TabsTrigger value="types">{COPY.tabs.types}</TabsTrigger>
          <TabsTrigger value="options">{COPY.tabs.options}</TabsTrigger>
          <TabsTrigger value="exceptions">
            {COPY.tabs.exceptions} ({rules.exceptions.length})
          </TabsTrigger>
          <TabsTrigger value="attention">
            {COPY.tabs.attention} ({attentionCount})
          </TabsTrigger>
          <TabsTrigger value="legacy">{COPY.tabs.legacy}</TabsTrigger>
        </TabsList>
        <TabsContent value="types" className="mt-3">
          <TypeTable types={rules.types} />
        </TabsContent>
        <TabsContent value="options" className="mt-3">
          <OptionList options={rules.options} />
        </TabsContent>
        <TabsContent value="exceptions" className="mt-3">
          <ExceptionTable rules={rules} />
        </TabsContent>
        <TabsContent value="attention" className="mt-3">
          <Attention rules={rules} />
        </TabsContent>
        <TabsContent value="legacy" className="mt-3">
          <LegacyCoverage />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Totals({ rules }: { rules: CurrentRules }) {
  const entries = [
    [rules.totals.products, COPY.totals.products],
    [rules.totals.types, COPY.totals.types],
    [rules.totals.options, COPY.totals.options],
    [rules.totals.pairs, COPY.totals.pairs],
    [rules.totals.exceptions, COPY.totals.exceptions],
  ] as const;
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
      {entries.map(([n, label]) => (
        <span key={label} className="text-muted-foreground">
          <span className="font-semibold tabular-nums text-foreground">{n.toLocaleString()}</span> {label}
        </span>
      ))}
      <Badge variant="secondary">{COPY.datasetNote(rules.dataset)}</Badge>
    </div>
  );
}

/** "(Materials) and (Ink)", "(Lamination or Surface Finish)". Categories in italics. */
function Requirements({ type }: { type: RuleTypeRow }) {
  if (type.decidedBy === "product") return <span className="text-muted-foreground">—</span>;
  if (type.requirements.length === 0) {
    return <span className="text-muted-foreground">{COPY.typeState.unconstrained}</span>;
  }
  return (
    <span>
      {type.requirements.map((req, i) => (
        <span key={i}>
          {i > 0 && <span className="px-1 text-xs font-semibold uppercase text-muted-foreground">and</span>}
          (
          {req.map((e, j) => (
            <span key={j}>
              {j > 0 && <span className="px-1 text-muted-foreground">or</span>}
              <span className={cn(e.isCategory && "italic")}>{e.name}</span>
            </span>
          ))}
          )
        </span>
      ))}
    </span>
  );
}

function TypeTable({ types }: { types: RuleTypeRow[] }) {
  const sorted = useMemo(
    () =>
      [...types].sort(
        (a, b) =>
          Number(a.decidedBy === "product") - Number(b.decidedBy === "product") ||
          a.title.localeCompare(b.title),
      ),
    [types],
  );
  return (
    <div className="overflow-x-auto rounded-md border border-border">
      <table className="w-full min-w-[48rem] text-sm">
        <thead className="bg-muted/40 text-left text-muted-foreground">
          <tr>
            <th className="px-3 py-2 font-medium">Type</th>
            <th className="px-3 py-2 font-medium">Who decides</th>
            <th className="px-3 py-2 font-medium">Requires</th>
            <th className="px-3 py-2 text-right font-medium">Options</th>
            <th className="px-3 py-2 text-right font-medium">Products offering</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((t) => (
            <tr key={t.id} className="border-t border-border align-top">
              <td className="px-3 py-2">
                <div className="font-medium text-foreground">{t.title}</div>
                <div className="text-xs text-muted-foreground">
                  {t.categoryTitle}
                  {t.customerSelects === "many" ? " · pick several" : ""}
                </div>
              </td>
              <td className="px-3 py-2 text-muted-foreground">{COPY.decidedBy[t.decidedBy]}</td>
              <td className="px-3 py-2">
                <Requirements type={t} />
                {t.state === "resolves-to-nothing" && (
                  <div className="text-xs text-destructive">{COPY.typeState["resolves-to-nothing"]}</div>
                )}
              </td>
              <td className="px-3 py-2 text-right tabular-nums">{t.optionCount}</td>
              <td className="px-3 py-2 text-right tabular-nums">{t.productsOffering}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** "Paperboard: all 12" · "all except Kraft, Cardstock" · "SBS, Kraft". */
function partnerText(p: PartnerLine): string {
  if (p.coverage === "all") return p.typeSize === 1 ? "all" : `all ${p.typeSize}`;
  if (p.coverage === "all-but") return `all except ${p.names.join(", ")}`;
  return p.names.join(", ");
}

const STATUS_TONE: Record<RuleOptionRow["status"], string> = {
  offered: "text-foreground",
  "offered-nowhere": "text-destructive",
  "compatible-with-nothing": "text-destructive",
  "unknown-type": "text-destructive",
};

function OptionList({ options }: { options: RuleOptionRow[] }) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (o) =>
        o.title.toLowerCase().includes(q) ||
        o.typeTitle.toLowerCase().includes(q) ||
        o.partners.some((p) => p.typeTitle.toLowerCase().includes(q) || p.names.some((n) => n.toLowerCase().includes(q))),
    );
  }, [options, query]);

  const byType = useMemo(() => {
    const groups = new Map<string, RuleOptionRow[]>();
    for (const o of filtered) groups.set(o.typeTitle, [...(groups.get(o.typeTitle) ?? []), o]);
    return [...groups].sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={COPY.filterOptions}
          className="max-w-sm"
          aria-label="Filter options"
        />
        <span className="text-sm tabular-nums text-muted-foreground">
          {query ? `${filtered.length} of ${options.length}` : `${options.length} options`}
        </span>
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-md border border-border p-4 text-sm text-muted-foreground">{COPY.noMatch(query)}</p>
      ) : (
        byType.map(([typeTitle, rows]) => (
          <section key={typeTitle} className="rounded-md border border-border">
            <h2 className="border-b border-border bg-muted/40 px-3 py-2 text-sm font-semibold text-foreground">
              {typeTitle}
            </h2>
            <ul className="divide-y divide-border">
              {rows.map((o) => (
                <li key={o.id} className="flex flex-col gap-1 px-3 py-2 text-sm">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <Link
                      href={`/spec/customizations/${encodeURIComponent(o.id)}`}
                      className="font-medium text-foreground hover:underline"
                    >
                      {o.title}
                    </Link>
                    <span className={cn("text-xs tabular-nums", STATUS_TONE[o.status])}>
                      {o.status === "offered"
                        ? `${o.productCount} products`
                        : COPY.optionStatus[o.status]}
                      {o.addedByException > 0 && ` · ${o.addedByException} by exception`}
                      {o.removedByException > 0 && ` · removed on ${o.removedByException}`}
                    </span>
                  </div>
                  {o.unmetRequirements.length > 0 && (
                    <p className="text-xs text-destructive">{COPY.unmet(o.unmetRequirements.join("; "))}</p>
                  )}
                  {o.partners.length > 0 && (
                    <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-xs">
                      {o.partners.map((p) => (
                        <div key={p.typeTitle} className="contents">
                          <dt className="text-muted-foreground">
                            {COPY.relation[p.relation]} {p.typeTitle}
                          </dt>
                          <dd className="text-foreground">{partnerText(p)}</dd>
                        </div>
                      ))}
                    </dl>
                  )}
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}

function ExceptionTable({ rules }: { rules: CurrentRules }) {
  if (rules.exceptions.length === 0) {
    return (
      <p className="rounded-md border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
        {COPY.exceptionsEmpty}
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-2">
      <p className="max-w-2xl text-sm text-muted-foreground">{COPY.exceptionsLead}</p>
      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full min-w-[40rem] text-sm">
          <thead className="bg-muted/40 text-left text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">Product</th>
              <th className="px-3 py-2 font-medium">Option</th>
              <th className="px-3 py-2 font-medium">Asks to</th>
              <th className="px-3 py-2 font-medium">Effect</th>
              <th className="px-3 py-2 font-medium">Reason</th>
            </tr>
          </thead>
          <tbody>
            {rules.exceptions.map((e, i) => (
              <tr key={i} className="border-t border-border">
                <td className="px-3 py-2">{e.productTitle}</td>
                <td className="px-3 py-2">{e.optionTitle}</td>
                <td className="px-3 py-2">{e.mode}</td>
                <td className={cn("px-3 py-2", e.effect === "added" || e.effect === "removed" ? "" : "text-destructive")}>
                  {e.effect}
                </td>
                <td className="px-3 py-2 text-muted-foreground">{e.reason ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AttentionSection({ title, lead, children, empty }: {
  title: string;
  lead?: string;
  empty: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-md border border-border p-3">
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      {lead && <p className="mt-0.5 text-xs text-muted-foreground">{lead}</p>}
      <div className="mt-2 text-sm">
        {empty ? <span className="text-muted-foreground">{COPY.attention.none}</span> : children}
      </div>
    </section>
  );
}

function Attention({ rules }: { rules: CurrentRules }) {
  const unmet = rules.options.filter((o) => o.unmetRequirements.length > 0);
  const nothing = rules.options.filter((o) => o.status === "compatible-with-nothing");
  const { missingReferences, siblingPairs, referencePairs, unknownDependencyReferences } = rules.attention;
  const pairList = (pairs: [string, string][]) => (
    <ul className="max-h-64 overflow-y-auto">
      {pairs.map(([a, b]) => <li key={`${a}|${b}`}>{a} ↔ {b}</li>)}
    </ul>
  );

  return (
    <div className="flex flex-col gap-3">
      <p className="max-w-2xl text-sm text-muted-foreground">{COPY.attentionLead}</p>
      <AttentionSection title={COPY.optionStatus["compatible-with-nothing"]} empty={nothing.length === 0}>
        <ul>{nothing.map((o) => <li key={o.id}>{o.title} <span className="text-muted-foreground">· {o.typeTitle}</span></li>)}</ul>
      </AttentionSection>
      <AttentionSection title="Options with a requirement they can never meet" empty={unmet.length === 0}>
        <ul>
          {unmet.map((o) => (
            <li key={o.id}>
              {o.title} <span className="text-muted-foreground">· {o.typeTitle} · no partner in {o.unmetRequirements.join("; ")}</span>
            </li>
          ))}
        </ul>
      </AttentionSection>
      <AttentionSection title={COPY.attention.missing} lead={COPY.attention.missingLead} empty={missingReferences.length === 0}>
        <ul className="max-h-64 overflow-y-auto font-mono text-xs">
          {missingReferences.map((m) => (
            <li key={m.id}>
              {m.id} <span className="font-sans text-muted-foreground">· named by {m.references} options</span>
            </li>
          ))}
        </ul>
      </AttentionSection>
      <AttentionSection title={COPY.attention.siblings} lead={COPY.attention.siblingsLead} empty={siblingPairs.length === 0}>
        {pairList(siblingPairs)}
      </AttentionSection>
      <AttentionSection title={COPY.attention.reference} lead={COPY.attention.referenceLead} empty={referencePairs.length === 0}>
        {pairList(referencePairs)}
      </AttentionSection>
      <AttentionSection title={COPY.attention.unknownDeps} empty={unknownDependencyReferences.length === 0}>
        <ul className="font-mono text-xs">{unknownDependencyReferences.map((r) => <li key={r}>{r}</li>)}</ul>
      </AttentionSection>
    </div>
  );
}

/** The old Property Controls explorer's L1–L15, and where each stands now (PROD-2614). */
function LegacyCoverage() {
  return (
    <div className="flex flex-col gap-2">
      <p className="max-w-2xl text-sm text-muted-foreground">{COPY.legacyLead}</p>
      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full min-w-[48rem] text-sm">
          <thead className="bg-muted/40 text-left text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">Rule</th>
              <th className="px-3 py-2 font-medium">Said</th>
              <th className="px-3 py-2 font-medium">Now</th>
              <th className="px-3 py-2 font-medium">Note</th>
            </tr>
          </thead>
          <tbody>
            {LEGACY_RULE_COVERAGE.map((r) => (
              <tr key={r.id} className="border-t border-border align-top">
                <td className="px-3 py-2 font-mono text-xs">{r.id}</td>
                <td className="px-3 py-2">{r.rule}</td>
                <td className={cn("px-3 py-2", r.status === "not-modelled" && "text-destructive")}>
                  {LEGACY_STATUS_LABEL[r.status]}
                </td>
                <td className="px-3 py-2 text-muted-foreground">{r.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
