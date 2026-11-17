"use client";

import { useId, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Badge } from "@pakfactory/ui/components/badge";
import { Button } from "@pakfactory/ui/components/button";
import { Checkbox } from "@pakfactory/ui/components/checkbox";
import { Textarea } from "@pakfactory/ui/components/textarea";
import { cn } from "@pakfactory/ui/lib/utils";
import { decideMappingsAction } from "@/app/(admin)/spec/mapping/actions";
import { WARNING_BADGE } from "@/components/spec/library/spec-value";
import { groupMappings, isOpenState, MAP_LABELS, settingText, targetHref } from "@/lib/spec/mapping-review";
import type { LibraryDecision, LibraryReviewState, MappingItem, MappingLabel } from "@/lib/spec/registry-api";
import { ADMIN_SPEC_MAPPING_COPY as COPY } from "@/lib/copy/spec-mapping";

const STATE_TONE: Record<LibraryReviewState, string> = {
  pending: "border-border bg-background",
  approve: "border-emerald-600/50 bg-emerald-500/10 text-emerald-900 dark:text-emerald-200",
  reject: "border-destructive/50 bg-destructive/10 text-destructive",
  defer: WARNING_BADGE,
};

const LABEL_TONE: Record<MappingLabel, string> = {
  mapped: "border-emerald-600/40 text-emerald-900 dark:text-emerald-200",
  mapped_with_preset: "border-emerald-600/40 text-emerald-900 dark:text-emerald-200",
  catch_all: WARNING_BADGE,
  no_equivalent: "border-destructive/50 text-destructive",
};

const labelName = (l: MappingLabel) => MAP_LABELS.find((x) => x.key === l)?.label ?? l;

/**
 * The maps of one kind, grouped the way a reviewer works (PLAT-52): products by style, options by
 * category · type, property values by property. Tick maps one by one or a whole group, then approve,
 * reject or defer them with one note. Each map still gets its own decision row.
 */
export function MappingReviewList({ items, canDecide, groupBy }: { items: MappingItem[]; canDecide: boolean; groupBy: string }) {
  const groups = useMemo(() => groupMappings(items), [items]);
  const [picked, setPicked] = useState<Set<number>>(new Set());
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const id = useId();

  function set(ids: number[], on: boolean) {
    setPicked((prev) => {
      const next = new Set(prev);
      for (const i of ids) {
        if (on) next.add(i);
        else next.delete(i);
      }
      return next;
    });
  }

  function decide(decision: LibraryDecision) {
    if (decision !== "approve" && !note.trim()) {
      setError(COPY.bar.noteNeeded);
      return;
    }
    setError(null);
    start(async () => {
      const res = await decideMappingsAction(decision, note.trim() || null, [...picked]);
      if (!res.ok) {
        setError(res.error);
        router.refresh();
        return;
      }
      toast.success(COPY.bar.done(res.recorded, COPY.bar.decided[decision]!));
      setPicked(new Set());
      setNote("");
      router.refresh();
    });
  }

  if (items.length === 0) return <p className="rounded-md border border-border p-4 text-sm text-muted-foreground">{COPY.empty}</p>;

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">{COPY.groupedBy(groupBy)}</p>
      {groups.map((g) => {
        const ids = g.items.map((i) => i.id);
        const all = ids.every((i) => picked.has(i));
        const some = !all && ids.some((i) => picked.has(i));
        const boxId = `${id}-${g.key}`;
        return (
          <section key={g.key} className="overflow-hidden rounded-md border border-border">
            <header className="flex items-center gap-2 bg-muted/40 px-3 py-2">
              {canDecide ? (
                <Checkbox
                  id={boxId}
                  checked={all ? true : some ? "indeterminate" : false}
                  onCheckedChange={(v) => set(ids, v === true)}
                  aria-label={COPY.selectGroup(ids.length)}
                  disabled={pending}
                />
              ) : null}
              <label htmlFor={boxId} className="text-sm font-medium">
                {g.title ?? "—"} <span className="font-normal text-muted-foreground">{g.items.length}</span>
              </label>
            </header>
            <ul className="divide-y divide-border">
              {g.items.map((m) => (
                <MappingRow key={m.id} m={m} canDecide={canDecide} checked={picked.has(m.id)} onCheck={(on) => set([m.id], on)} disabled={pending} />
              ))}
            </ul>
          </section>
        );
      })}

      {canDecide && picked.size > 0 ? (
        <div className="sticky bottom-4 z-10 flex flex-col gap-2 rounded-md border border-border bg-background p-3 shadow-lg">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium">{COPY.bar.selected(picked.size)}</span>
            <Button size="sm" onClick={() => decide("approve")} disabled={pending}>
              {pending ? COPY.deciding : COPY.bar.approve}
            </Button>
            <Button size="sm" variant="outline" onClick={() => decide("defer")} disabled={pending}>
              {COPY.bar.defer}
            </Button>
            <Button size="sm" variant="outline" className="text-destructive" onClick={() => decide("reject")} disabled={pending}>
              {COPY.bar.reject}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setPicked(new Set())} disabled={pending}>
              {COPY.bar.clear}
            </Button>
          </div>
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder={COPY.bar.note} aria-label={COPY.bar.note} rows={1} maxLength={2000} disabled={pending} />
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function MappingRow({ m, canDecide, checked, onCheck, disabled }: { m: MappingItem; canDecide: boolean; checked: boolean; onCheck: (on: boolean) => void; disabled: boolean }) {
  const rowId = `map-${m.id}`;
  return (
    <li className={cn("grid gap-x-4 gap-y-2 px-3 py-3 text-sm md:grid-cols-[minmax(0,14rem)_minmax(0,1fr)_minmax(0,12rem)]", !isOpenState(m.state) && "bg-muted/10")}>
      <div className="flex min-w-0 items-start gap-2">
        {canDecide ? <Checkbox id={rowId} className="mt-0.5" checked={checked} onCheckedChange={(v) => onCheck(v === true)} disabled={disabled} /> : null}
        <label htmlFor={rowId} className="flex min-w-0 flex-col">
          <span className="font-medium">{m.subjectName ?? m.subjectCode}</span>
          <span className="font-mono text-xs text-muted-foreground">{m.subjectCode}</span>
        </label>
      </div>

      <div className="flex min-w-0 flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="outline" className={cn("font-normal", LABEL_TONE[m.label])}>
            {labelName(m.label)}
          </Badge>
          {m.targets.length === 0 ? <span className="text-muted-foreground">{COPY.noTarget}</span> : null}
          {m.targets.map((t) => (
            <Link key={`${t.kind}/${t.sourceId}`} href={targetHref(t)} className="inline-flex items-baseline gap-1 rounded-md border border-border px-2 py-0.5 hover:bg-muted" title={`${t.sourceId} · v${t.version}`}>
              <span>{t.name ?? t.sourceId}</span>
              {t.setting ? <span className="text-muted-foreground">{settingText(t.setting)}</span> : null}
            </Link>
          ))}
        </div>
        {m.presets.length > 0 ? (
          <ul className="flex flex-wrap gap-1.5">
            {m.presets.map((p, n) => (
              <li key={n} className="inline-flex items-baseline gap-1 rounded-md bg-muted/50 px-2 py-0.5 text-xs">
                <span>
                  {p.label}
                  {p.value ? ` = ${p.value}` : ""}
                </span>
                {p.sourceId ? (
                  <span className="font-mono text-muted-foreground">{p.sourceId}</span>
                ) : (
                  <Badge variant="outline" className={cn("px-1 py-0 text-[10px] font-normal", WARNING_BADGE)}>
                    {COPY.needsCode}
                  </Badge>
                )}
              </li>
            ))}
          </ul>
        ) : null}
        {m.noEquivalentReason || m.draftNotes ? (
          <p className="text-xs text-muted-foreground">
            {m.confidence ? `${COPY.confidence[m.confidence]} · ` : ""}
            {m.noEquivalentReason ?? m.draftNotes}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col items-start gap-1">
        <Badge variant="outline" className={cn("font-normal", STATE_TONE[m.state])}>
          {COPY.states[m.state]}
        </Badge>
        {m.note ? <span className="text-xs">“{m.note}”</span> : null}
        {m.decidedByName ? <span className="text-xs text-muted-foreground">{m.decidedByName}</span> : null}
      </div>
    </li>
  );
}
