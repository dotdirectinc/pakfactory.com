"use client";

import { useId, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChevronRight, ChevronsDownUp, ChevronsUpDown } from "lucide-react";
import { Badge } from "@pakfactory/ui/components/badge";
import { Button } from "@pakfactory/ui/components/button";
import { Checkbox } from "@pakfactory/ui/components/checkbox";
import { Textarea } from "@pakfactory/ui/components/textarea";
import { cn } from "@pakfactory/ui/lib/utils";
import { decideMappingsAction } from "@/app/(admin)/spec/mapping/actions";
import { WARNING_BADGE } from "@/components/spec/library/spec-value";
import {
  groupMappings,
  isOpenState,
  MAP_LABELS,
  settingText,
  targetHref,
} from "@/lib/spec/mapping-review";
import {
  previewProductionAction,
  previewWebsiteAction,
  type PreviewResult,
} from "@/app/(admin)/spec/mapping/preview-actions";
import { SpecHoverLink } from "@/components/spec/mapping/spec-hover-link";
import type {
  LibraryDecision,
  LibraryReviewState,
  MappingItem,
  MappingLabel,
  MappingTarget,
} from "@/lib/spec/registry-api";
import { ADMIN_SPEC_MAPPING_COPY as COPY } from "@/lib/copy/spec-mapping";

const STATE_TONE: Record<LibraryReviewState, string> = {
  pending: "border-border bg-background",
  approve:
    "border-emerald-600/50 bg-emerald-500/10 text-emerald-900 dark:text-emerald-200",
  reject: "border-destructive/50 bg-destructive/10 text-destructive",
  defer: WARNING_BADGE,
};

const LABEL_TONE: Record<MappingLabel, string> = {
  mapped: "border-emerald-600/40 text-emerald-900 dark:text-emerald-200",
  mapped_with_preset:
    "border-emerald-600/40 text-emerald-900 dark:text-emerald-200",
  catch_all: WARNING_BADGE,
  no_equivalent: "border-destructive/50 text-destructive",
};

const labelName = (l: MappingLabel) =>
  MAP_LABELS.find((x) => x.key === l)?.label ?? l;

/**
 * The maps of one kind, grouped the way a reviewer works (PLAT-52): products by style, options by
 * category · type, property values by property. Tick maps one by one or a whole group, then approve,
 * reject or defer them with one note. Each map still gets its own decision row.
 */
export function MappingReviewList({
  items,
  links,
  canDecide,
  groupBy,
}: {
  items: MappingItem[];
  links: Record<string, WebsiteLink>;
  canDecide: boolean;
  groupBy: string;
}) {
  const groups = useMemo(() => groupMappings(items), [items]);
  const [picked, setPicked] = useState<Set<number>>(new Set());
  const [folded, setFolded] = useState<Set<string>>(new Set());
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
      const res = await decideMappingsAction(decision, note.trim() || null, [
        ...picked,
      ]);
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

  if (items.length === 0)
    return (
      <p className="rounded-md border border-border p-4 text-sm text-muted-foreground">
        {COPY.empty}
      </p>
    );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {COPY.groupedBy(groupBy)}
        </p>
        <div className="flex gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setFolded(new Set())}
            disabled={folded.size === 0}
          >
            <ChevronsUpDown className="size-4" /> {COPY.expandAll}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setFolded(new Set(groups.map((g) => g.key)))}
            disabled={folded.size === groups.length}
          >
            <ChevronsDownUp className="size-4" /> {COPY.collapseAll}
          </Button>
        </div>
      </div>
      {groups.map((g) => {
        const ids = g.items.map((i) => i.id);
        const all = ids.every((i) => picked.has(i));
        const some = !all && ids.some((i) => picked.has(i));
        const boxId = `${id}-${g.key}`;
        const open = !folded.has(g.key);
        const decided = g.items.filter((i) => !isOpenState(i.state)).length;
        const chosen = ids.filter((i) => picked.has(i)).length;
        const bodyId = `${boxId}-body`;
        return (
          <section
            key={g.key}
            className="overflow-hidden rounded-md border border-border"
          >
            <header className="flex items-center gap-2 bg-muted/40 px-3 py-2">
              <button
                type="button"
                onClick={() =>
                  setFolded((prev) => {
                    const next = new Set(prev);
                    if (open) next.add(g.key);
                    else next.delete(g.key);
                    return next;
                  })
                }
                aria-expanded={open}
                aria-controls={bodyId}
                aria-label={
                  open
                    ? COPY.collapseGroup(g.title ?? "—")
                    : COPY.expandGroup(g.title ?? "—")
                }
                className="-ml-1 rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <ChevronRight
                  className={cn(
                    "size-4 transition-transform",
                    open && "rotate-90",
                  )}
                />
              </button>
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
                {g.title ?? "—"}{" "}
                <span className="font-normal text-muted-foreground">
                  {g.items.length}
                </span>
              </label>
              <span className="ml-auto text-xs text-muted-foreground">
                {COPY.groupDecided(decided, g.items.length)}
                {chosen > 0 ? ` · ${COPY.groupSelected(chosen)}` : ""}
              </span>
            </header>
            {open ? (
              <div id={bodyId}>
                <div
                  aria-hidden
                  className="hidden gap-x-3 border-b border-border px-3 py-1.5 text-xs font-medium text-muted-foreground md:grid md:grid-cols-[minmax(0,1fr)_7.5rem_minmax(0,1.4fr)_minmax(0,9rem)]"
                >
                  <span className={canDecide ? "pl-6" : undefined}>
                    {COPY.columns.item}
                  </span>
                  <span className="text-center">{COPY.columns.how}</span>
                  <span>{COPY.columns.maps}</span>
                  <span>{COPY.columns.state}</span>
                </div>
                <ul className="divide-y divide-border">
                  {g.items.map((m) => (
                    <MappingRow
                      key={m.id}
                      m={m}
                      link={links[m.subjectId]}
                      canDecide={canDecide}
                      checked={picked.has(m.id)}
                      onCheck={(on) => set([m.id], on)}
                      disabled={pending}
                    />
                  ))}
                </ul>
              </div>
            ) : null}
          </section>
        );
      })}

      {canDecide && picked.size > 0 ? (
        <div className="sticky bottom-4 z-10 flex flex-col gap-2 rounded-md border border-border bg-background p-3 shadow-lg">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium">
              {COPY.bar.selected(picked.size)}
            </span>
            <Button
              size="sm"
              onClick={() => decide("approve")}
              disabled={pending}
            >
              {pending ? COPY.deciding : COPY.bar.approve}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => decide("defer")}
              disabled={pending}
            >
              {COPY.bar.defer}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-destructive"
              onClick={() => decide("reject")}
              disabled={pending}
            >
              {COPY.bar.reject}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setPicked(new Set())}
              disabled={pending}
            >
              {COPY.bar.clear}
            </Button>
          </div>
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={COPY.bar.note}
            aria-label={COPY.bar.note}
            rows={1}
            maxLength={2000}
            disabled={pending}
          />
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

export type WebsiteLink = { href: string; table: string; id: string };

const KIND_NOUN: Record<MappingItem["subjectKind"], string> = {
  product: "Website product",
  option: "Website option",
  property_value: "Website property value",
};
const TARGET_NOUN: Record<MappingTarget["kind"], string> = {
  product_type: "Product type",
  capability: "Capability",
  field: "Field",
};
const COLLECTION: Record<MappingTarget["kind"], string> = {
  product_type: "product_type",
  capability: "capability",
  field: "field",
};

/** The website side when the catalog has no page for it: what the map itself knows. */
function staticPreview(m: MappingItem): PreviewResult {
  const facts: [string, string][] = [["Product line", m.line]];
  if (m.group)
    facts.push([
      m.subjectKind === "product"
        ? "Style"
        : m.subjectKind === "option"
          ? "Category · type"
          : "Property",
      m.group,
    ]);
  return {
    ok: true,
    data: {
      title: m.subjectName ?? m.subjectCode,
      code: m.subjectCode,
      kind: KIND_NOUN[m.subjectKind],
      lead: null,
      facts,
      image: null,
    },
  };
}

function MappingRow({
  m,
  link,
  canDecide,
  checked,
  onCheck,
  disabled,
}: {
  m: MappingItem;
  link: WebsiteLink | undefined;
  canDecide: boolean;
  checked: boolean;
  onCheck: (on: boolean) => void;
  disabled: boolean;
}) {
  const rowId = `map-${m.id}`;
  return (
    <li
      className={cn(
        "grid items-start gap-x-3 gap-y-2 px-3 py-3 text-sm md:grid-cols-[minmax(0,1fr)_7.5rem_minmax(0,1.4fr)_minmax(0,9rem)]",
        !isOpenState(m.state) && "bg-muted/10",
      )}
    >
      {/* Website (customer) spec */}
      <div className="flex min-w-0 items-start gap-2">
        {canDecide ? (
          <Checkbox
            id={rowId}
            className="mt-1"
            checked={checked}
            onCheckedChange={(v) => onCheck(v === true)}
            disabled={disabled}
            aria-label={COPY.selectMap(m.subjectName ?? m.subjectCode)}
          />
        ) : null}
        <div className="flex min-w-0 flex-1 flex-col rounded-md border border-border bg-background px-2.5 py-1.5">
          <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
            {KIND_NOUN[m.subjectKind]}
          </span>
          <SpecHoverLink
            side="website"
            href={link?.href ?? null}
            load={() =>
              link
                ? previewWebsiteAction(link.table, link.id)
                : Promise.resolve(staticPreview(m))
            }
            className="font-medium"
          >
            {m.subjectName ?? m.subjectCode}
          </SpecHoverLink>
          <span className="font-mono text-xs text-muted-foreground">
            {m.subjectCode}
          </span>
        </div>
      </div>

      {/* How it maps */}
      <div className="flex flex-row items-center gap-2 md:flex-col md:items-center md:pt-2">
        <span
          aria-hidden
          className="text-lg leading-none text-muted-foreground"
        >
          →
        </span>
        <Badge
          variant="outline"
          className={cn(
            "whitespace-normal text-center font-normal",
            LABEL_TONE[m.label],
          )}
          title={MAP_LABELS.find((x) => x.key === m.label)?.hint}
        >
          {labelName(m.label)}
        </Badge>
        {m.confidence ? (
          <span className="text-[11px] text-muted-foreground">
            {COPY.confidence[m.confidence]}
          </span>
        ) : null}
      </div>

      {/* Production spec */}
      <div className="flex min-w-0 flex-col gap-1.5">
        {m.targets.length === 0 ? (
          <div className="rounded-md border border-dashed border-destructive/40 px-2.5 py-1.5 text-muted-foreground">
            {COPY.noTarget}
            {m.noEquivalentReason ? (
              <span className="block text-xs">{m.noEquivalentReason}</span>
            ) : null}
          </div>
        ) : (
          m.targets.map((t) => (
            <div
              key={`${t.kind}/${t.sourceId}`}
              className="flex min-w-0 flex-col rounded-md border border-border bg-background px-2.5 py-1.5"
            >
              <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
                {TARGET_NOUN[t.kind]}
              </span>
              <span className="flex flex-wrap items-baseline gap-x-1.5">
                <SpecHoverLink
                  side="production"
                  href={targetHref(t)}
                  load={() =>
                    previewProductionAction(
                      t.version,
                      COLLECTION[t.kind],
                      t.sourceId,
                    )
                  }
                  className="font-medium"
                >
                  {t.name ?? t.sourceId}
                </SpecHoverLink>
                {t.setting ? (
                  <span className="text-muted-foreground">
                    {settingText(t.setting)}
                  </span>
                ) : null}
              </span>
              <span className="font-mono text-xs text-muted-foreground">
                {t.sourceId}
              </span>
            </div>
          ))
        )}
        {m.presets.length > 0 ? (
          <div className="flex flex-col gap-1">
            <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
              {COPY.presetsHeading}
            </span>
            <ul className="flex flex-wrap gap-1.5">
              {m.presets.map((p, n) => (
                <li
                  key={n}
                  className="inline-flex items-baseline gap-1 rounded-md bg-muted/50 px-2 py-0.5 text-xs"
                >
                  <span>
                    {p.label}
                    {p.value ? ` = ${p.value}` : ""}
                  </span>
                  {p.sourceId && p.version ? (
                    <SpecHoverLink
                      side="production"
                      href={targetHref({
                        kind: "capability",
                        sourceId: p.sourceId,
                        version: p.version,
                      })}
                      load={() =>
                        previewProductionAction(
                          p.version!,
                          "capability",
                          p.sourceId!,
                        )
                      }
                      className="font-mono text-muted-foreground"
                    >
                      {p.sourceId}
                    </SpecHoverLink>
                  ) : (
                    <Badge
                      variant="outline"
                      className={cn(
                        "px-1 py-0 text-[10px] font-normal",
                        WARNING_BADGE,
                      )}
                    >
                      {COPY.needsCode}
                    </Badge>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {m.draftNotes && m.draftNotes !== m.noEquivalentReason ? (
          <p className="text-xs text-muted-foreground">
            {COPY.draftNote(m.draftNotes)}
          </p>
        ) : null}
      </div>

      {/* Decision */}
      <div className="flex flex-col items-start gap-1">
        <Badge
          variant="outline"
          className={cn("font-normal", STATE_TONE[m.state])}
        >
          {COPY.states[m.state]}
        </Badge>
        {m.note ? <span className="text-xs">“{m.note}”</span> : null}
        {m.decidedByName ? (
          <span className="text-xs text-muted-foreground">
            {m.decidedByName}
          </span>
        ) : null}
      </div>
    </li>
  );
}
