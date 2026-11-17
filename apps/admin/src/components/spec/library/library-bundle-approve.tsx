"use client";

import { useId, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Badge } from "@pakfactory/ui/components/badge";
import { Button } from "@pakfactory/ui/components/button";
import { Checkbox } from "@pakfactory/ui/components/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@pakfactory/ui/components/dialog";
import { Textarea } from "@pakfactory/ui/components/textarea";
import { cn } from "@pakfactory/ui/lib/utils";
import { approveBundleAction } from "@/app/(admin)/spec/library/actions";
import { bundleSections, decisionBatches, defaultSelection, isOpen, isShared, keyOf } from "@/lib/spec/library-bundle";
import type { LibraryBundleItem } from "@/lib/spec/registry-api";
import { ADMIN_SPEC_LIBRARY_COPY } from "@/lib/copy/spec-library";
import { WARNING_BADGE } from "@/components/spec/library/spec-value";

const COPY = ADMIN_SPEC_LIBRARY_COPY.productType;

/**
 * "Approve…" for a product type's review page (PLAT-81): a dialog listing every open record of the
 * group with a tick box. Records owned by this product type start ticked; shared ones (the global and
 * line templates, capabilities) start unticked and say how many product types they apply to. One
 * approval row per ticked record, sent as one call per library version.
 */
export function LibraryBundleApprove({ name, items }: { name: string; items: LibraryBundleItem[] }) {
  const open = useMemo(() => items.filter(isOpen), [items]);
  const sections = useMemo(() => bundleSections(open), [open]);
  const [show, setShow] = useState(false);
  const [picked, setPicked] = useState<Set<string>>(() => defaultSelection(items));
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const id = useId();

  function openDialog(v: boolean) {
    if (v) {
      setPicked(defaultSelection(items));
      setError(null);
    }
    setShow(v);
  }

  function toggle(key: string, on: boolean) {
    setPicked((prev) => {
      const next = new Set(prev);
      if (on) next.add(key);
      else next.delete(key);
      return next;
    });
  }

  function toggleSection(list: LibraryBundleItem[], on: boolean) {
    setPicked((prev) => {
      const next = new Set(prev);
      for (const i of list) {
        if (on) next.add(keyOf(i));
        else next.delete(keyOf(i));
      }
      return next;
    });
  }

  const chosen = open.filter((i) => picked.has(keyOf(i)));
  const summary = sections
    .map((s) => [s.title, s.items.filter((i) => picked.has(keyOf(i))).length] as const)
    .filter(([, n]) => n > 0)
    .map(([t, n]) => `${n} × ${t.toLowerCase()}`)
    .join(", ");

  function approve() {
    setError(null);
    start(async () => {
      const res = await approveBundleAction(decisionBatches(items, picked), note.trim() || null);
      if (!res.ok) {
        setError(res.error);
        router.refresh();
        return;
      }
      toast.success(COPY.dialog.done(res.recorded ?? chosen.length));
      setNote("");
      setShow(false);
      router.refresh();
    });
  }

  return (
    <>
      <Button onClick={() => openDialog(true)} disabled={open.length === 0}>
        {COPY.approve(open.length)}
      </Button>
      <Dialog open={show} onOpenChange={openDialog}>
        <DialogContent className="flex max-h-[85vh] flex-col sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{COPY.dialog.title(name)}</DialogTitle>
            <DialogDescription>{COPY.dialog.lead}</DialogDescription>
          </DialogHeader>

          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => setPicked(new Set(open.map(keyOf)))} disabled={pending}>
              {COPY.dialog.selectAll}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setPicked(defaultSelection(items))} disabled={pending}>
              {COPY.dialog.selectOwned}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setPicked(new Set())} disabled={pending}>
              {COPY.dialog.selectNone}
            </Button>
          </div>

          <div className="-mx-6 min-h-0 flex-1 overflow-y-auto border-y border-border px-6 py-4">
            <div className="flex flex-col gap-6">
              {sections.map((s) => {
                const all = s.items.every((i) => picked.has(keyOf(i)));
                const some = !all && s.items.some((i) => picked.has(keyOf(i)));
                const boxId = `${id}-${s.key}`;
                return (
                  <section key={s.key} className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id={boxId}
                        checked={all ? true : some ? "indeterminate" : false}
                        onCheckedChange={(v) => toggleSection(s.items, v === true)}
                        disabled={pending}
                      />
                      <label htmlFor={boxId} className="text-sm font-medium">
                        {s.title} <span className="font-normal text-muted-foreground">{s.items.length}</span>
                      </label>
                    </div>
                    <ul className="flex flex-col gap-1 pl-6">
                      {s.items.map((i) => {
                        const rowId = `${id}-${keyOf(i)}`;
                        return (
                          <li key={keyOf(i)} className="flex items-start gap-2 text-sm">
                            <Checkbox
                              id={rowId}
                              className="mt-0.5"
                              checked={picked.has(keyOf(i))}
                              onCheckedChange={(v) => toggle(keyOf(i), v === true)}
                              disabled={pending}
                            />
                            <label htmlFor={rowId} className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2 gap-y-1">
                              <span className="truncate">{i.label ?? i.sourceId}</span>
                              <span className="font-mono text-xs text-muted-foreground">{i.sourceId}</span>
                              <span className="text-xs text-muted-foreground">{COPY.dialog.version(i.version)}</span>
                              {i.state === "defer" ? (
                                <Badge variant="outline" className={cn("text-xs", WARNING_BADGE)}>
                                  {COPY.dialog.deferred}
                                </Badge>
                              ) : null}
                              {isShared(i) ? (
                                <Badge variant="outline" className={cn("text-xs", WARNING_BADGE)}>
                                  {COPY.dialog.shared(i.sharedBy)}
                                </Badge>
                              ) : (
                                <span className="text-xs text-muted-foreground">{COPY.dialog.own}</span>
                              )}
                            </label>
                          </li>
                        );
                      })}
                    </ul>
                  </section>
                );
              })}
            </div>
          </div>

          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={COPY.dialog.note}
            aria-label={COPY.dialog.note}
            rows={2}
            maxLength={2000}
            disabled={pending}
          />
          {summary ? <p className="text-sm">{COPY.dialog.summary(summary)}</p> : null}
          <p className="text-xs text-muted-foreground">{COPY.dialog.rejectHint}</p>
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShow(false)} disabled={pending}>
              {COPY.dialog.cancel}
            </Button>
            <Button onClick={approve} disabled={pending || chosen.length === 0}>
              {pending ? ADMIN_SPEC_LIBRARY_COPY.deciding : COPY.dialog.confirm(chosen.length)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
