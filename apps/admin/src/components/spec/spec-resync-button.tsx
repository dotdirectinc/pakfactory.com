"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@pakfactory/ui/components/button";
import { requestSyncAction } from "@/app/(admin)/spec/actions";
import { ADMIN_SPEC_COPY } from "@/lib/copy/spec";
import { SpecNotionSyncDialog } from "@/components/spec/spec-notion-sync-dialog";
import { watchSyncRun } from "@/lib/spec/sync-watch";

type Props = {
  kind: "sanity" | "notion";
  dataset: string;
};

/**
 * Re-sync from a pending sync frame (2026-10-06). It reruns the sync that made the frame: that sync
 * replaces ALL its pending frames for the dataset with the newest values (re-sync replaces), so this
 * one is superseded and its undecided changes reappear in the new frame. The backend re-checks the
 * capability — `catalog.sync`, and `catalog.sync.notion` for a Notion frame. A Notion re-sync asks
 * again which fields Notion owns for the run (2026-10-21).
 */
export function SpecResyncButton({ kind, dataset }: Props) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const [notionOpen, setNotionOpen] = useState(false);

  function resync() {
    if (kind === "notion") {
      setNotionOpen(true);
      return;
    }
    start(async () => {
      const res = await requestSyncAction(kind, dataset);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      watchSyncRun(res.runId);
      toast.success(ADMIN_SPEC_COPY.resyncStarted);
      router.push("/spec");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button size="sm" variant="outline" disabled={pending} onClick={resync}>
        {pending ? ADMIN_SPEC_COPY.resyncing : ADMIN_SPEC_COPY.resync}
      </Button>
      <span className="text-xs text-muted-foreground">{ADMIN_SPEC_COPY.resyncHint}</span>
      {kind === "notion" ? <SpecNotionSyncDialog open={notionOpen} onOpenChange={setNotionOpen} dataset={dataset} /> : null}
    </div>
  );
}
