"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@pakfactory/ui/components/button";
import { Checkbox } from "@pakfactory/ui/components/checkbox";
import { requestSyncAction } from "@/app/(admin)/spec/actions";
import { ADMIN_SPEC_SYNC_COPY as COPY } from "@/lib/copy/spec";

/**
 * Sync Changes, in the Registry's header (PROD-3115): dataset, SKUs and the button in one row. A run
 * queues on the backend; what it finds arrives as waiting frames. While one is open the button is
 * disabled and the page refreshes itself (AutoRefresh, next to this).
 */
export function RegistrySyncControl({ canSync, open }: { canSync: boolean; open: boolean }) {
  const [dataset, setDataset] = useState("development");
  // SKUs are permanent once approved, so they are asked for per run and never stay ticked.
  const [includeSku, setIncludeSku] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  if (!canSync) return <p className="text-xs text-muted-foreground">{COPY.noPermission}</p>;

  const request = () => {
    setError(null);
    startTransition(async () => {
      const res = await requestSyncAction("sanity", dataset, includeSku);
      if (!res.ok) setError(res.error);
      else setIncludeSku(false);
      router.refresh();
    });
  };

  return (
    <div className="flex flex-col items-start gap-1 sm:items-end">
      <div className="flex flex-wrap items-center gap-2">
        <label className="sr-only" htmlFor="registry-sync-dataset">{COPY.datasetLabel}</label>
        <select
          id="registry-sync-dataset"
          className="h-8 rounded-md border border-input bg-background px-2 text-sm text-foreground"
          value={dataset}
          disabled={pending || open}
          onChange={(e) => setDataset(e.target.value)}
        >
          {COPY.datasets.map((d) => (
            <option key={d.value} value={d.value} disabled={!d.enabled}>
              {d.label}
            </option>
          ))}
        </select>
        <label className="flex h-8 items-center gap-2 text-sm text-foreground" title={COPY.includeSkuHint}>
          <Checkbox checked={includeSku} disabled={pending || open} onCheckedChange={(v) => setIncludeSku(v === true)} />
          {COPY.includeSku}
        </label>
        <Button size="sm" disabled={pending || open} onClick={request}>
          {pending ? COPY.requesting : COPY.button}
        </Button>
      </div>
      {open ? <p className="text-xs text-muted-foreground">{COPY.open}</p> : null}
      {includeSku ? <p className="max-w-md text-xs text-muted-foreground sm:text-right">{COPY.includeSkuHint}</p> : null}
      {error ? <p role="alert" className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
