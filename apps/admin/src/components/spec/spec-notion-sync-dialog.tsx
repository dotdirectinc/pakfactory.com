"use client";

import { useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
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
import { requestSyncAction } from "@/app/(admin)/spec/actions";
import { DEFAULT_NOTION_FIELD_GROUPS, NOTION_FIELD_GROUPS, type NotionFieldGroup } from "@/lib/spec/notion-fields";
import { ADMIN_SPEC_NOTION_SYNC_COPY as COPY } from "@/lib/copy/spec";
import { watchSyncRun } from "@/lib/spec/sync-watch";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dataset: string;
};

/**
 * Sync from Notion as a forced, manual sync of the fields the person ticks (Richard, 2026-10-21).
 * Studio owns these fields day to day; for this run Notion owns the ticked groups and every difference
 * in them is proposed, decided before or not. The backend re-checks the capability and refuses Parents
 * while the Spec System owns structure.
 */
export function SpecNotionSyncDialog({ open, onOpenChange, dataset }: Props) {
  const [picked, setPicked] = useState<Set<NotionFieldGroup>>(() => new Set(DEFAULT_NOTION_FIELD_GROUPS));
  const [pending, start] = useTransition();
  const router = useRouter();
  const id = useId();

  function toggle(group: NotionFieldGroup, on: boolean) {
    setPicked((prev) => {
      const next = new Set(prev);
      if (on) next.add(group);
      else next.delete(group);
      return next;
    });
  }

  function sync() {
    start(async () => {
      const groups = NOTION_FIELD_GROUPS.filter((g) => picked.has(g));
      const res = await requestSyncAction("notion", dataset, false, groups);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      watchSyncRun(res.runId);
      toast.success(COPY.started);
      onOpenChange(false);
      router.push("/spec");
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{COPY.title}</DialogTitle>
          <DialogDescription>{COPY.description}</DialogDescription>
        </DialogHeader>
        <div className="flex items-center gap-3 text-xs">
          <button type="button" className="text-foreground underline-offset-2 hover:underline" onClick={() => setPicked(new Set(NOTION_FIELD_GROUPS))}>
            {COPY.all}
          </button>
          <button type="button" className="text-foreground underline-offset-2 hover:underline" onClick={() => setPicked(new Set())}>
            {COPY.none}
          </button>
        </div>
        <ul className="flex flex-col gap-3">
          {NOTION_FIELD_GROUPS.map((group) => {
            const box = `${id}-${group}`;
            return (
              <li key={group} className="flex items-start gap-3">
                <Checkbox id={box} className="mt-0.5" checked={picked.has(group)} onCheckedChange={(v) => toggle(group, v === true)} />
                <label htmlFor={box} className="flex flex-col gap-0.5 text-sm">
                  <span className="font-medium text-foreground">{COPY.groups[group].label}</span>
                  <span className="text-xs text-muted-foreground">{COPY.groups[group].hint}</span>
                </label>
              </li>
            );
          })}
        </ul>
        <DialogFooter className="items-center">
          {picked.size === 0 ? <span className="mr-auto text-xs text-muted-foreground">{COPY.noneTicked}</span> : null}
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
            {COPY.cancel}
          </Button>
          <Button onClick={sync} disabled={pending || picked.size === 0}>
            {pending ? COPY.starting : COPY.start}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
