"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Badge } from "@pakfactory/ui/components/badge";
import { Button } from "@pakfactory/ui/components/button";
import { dismissSyncAction, requestSyncAction } from "@/app/(admin)/spec/actions";
import type { SyncRun, SyncWriteProblem } from "@/lib/spec/registry-api";
import { ADMIN_SPEC_SYNC_COPY as COPY, ADMIN_SPEC_SYNC_HISTORY_COPY as HISTORY } from "@/lib/copy/spec";

type Props = {
  runs: SyncRun[];
  /** The grant holds `catalog.sync` — approvers and admins. */
  canSync: boolean;
  /** Approved changes that did not reach Sanity (empty when all were written). */
  problems?: SyncWriteProblem[];
};

const POLL_MS = 3000;

/**
 * What the panel lists (2026-10-06: failed syncs should not stay): dismissed runs never; a failure
 * only until a later run of the same kind succeeds. The rows themselves are kept by the backend.
 */
function visibleRuns(runs: SyncRun[]): SyncRun[] {
  const lastDone = new Map<string, string>();
  for (const r of runs) if (r.state === "done" && r.requested_at > (lastDone.get(r.kind) ?? "")) lastDone.set(r.kind, r.requested_at);
  return runs.filter((r) => !r.dismissed_at && !(r.state === "failed" && r.requested_at < (lastDone.get(r.kind) ?? "")));
}

const when = (iso: string) =>
  new Date(iso).toLocaleString("en-CA", { dateStyle: "medium", timeStyle: "short" });

/**
 * Sync Sanity and Sync from Notion (PROD-2751). A button queues a run; the backend worker compares
 * the two sides and loads what differs as draft frames. While a run is open the page refreshes
 * itself, so the new frames appear without a reload.
 */
export function SpecSyncPanel({ runs, canSync, problems = [] }: Props) {
  const [dataset, setDataset] = useState("development");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const open = runs.some((r) => r.state === "requested" || r.state === "running");
  const shown = visibleRuns(runs);

  useEffect(() => {
    if (!open) return;
    const t = setInterval(() => router.refresh(), POLL_MS);
    return () => clearInterval(t);
  }, [open, router]);

  function request() {
    setError(null);
    startTransition(async () => {
      const res = await requestSyncAction("sanity", dataset);
      if (!res.ok) setError(res.error);
      router.refresh();
    });
  }

  function dismiss(id: string) {
    setError(null);
    startTransition(async () => {
      const res = await dismissSyncAction(id);
      if (!res.ok) setError(res.error);
      router.refresh();
    });
  }

  return (
    <section className="flex flex-col gap-3 rounded-md border border-border p-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-base font-semibold text-foreground">{COPY.title}</h2>
        <p className="max-w-2xl text-sm text-muted-foreground">{COPY.lead}</p>
      </div>

      {canSync ? (
        <div className="flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted-foreground">{COPY.datasetLabel}</span>
            <select
              className="h-9 rounded-md border border-input bg-background px-2 text-sm text-foreground"
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
          </label>
          <Button size="sm" disabled={pending || open} onClick={request}>
            {pending ? COPY.requesting : COPY.button}
          </Button>
          {open ? <span className="text-sm text-muted-foreground">{COPY.open}</span> : null}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">{COPY.noPermission}</p>
      )}
      {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}

      {problems.length ? (
        <div role="alert" className="flex flex-col gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm">
          <p className="font-medium text-destructive">{COPY.problemsTitle(problems.length)}</p>
          <p className="text-muted-foreground">{COPY.problemsLead}</p>
          <ul className="flex flex-col gap-1">
            {problems.slice(0, 10).map((p) => (
              <li key={p.item_id} className="flex flex-col">
                <span className="text-foreground">
                  {p.title} · {p.fields.join(", ")} — {COPY.problemStates[p.state]}
                  {p.error ? <span className="text-muted-foreground"> ({p.error})</span> : null}
                </span>
                <Link href={`/spec/${p.changeset_id}`} className="text-xs text-muted-foreground underline-offset-2 hover:underline">
                  {p.frame}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-sm font-medium text-foreground">{COPY.recent}</h3>
          <Link href="/spec/syncs" className="text-sm text-muted-foreground underline-offset-2 hover:underline">
            {HISTORY.link} →
          </Link>
        </div>
        {shown.length === 0 ? (
          <p className="text-sm text-muted-foreground">{COPY.none}</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border text-sm">
            {shown.slice(0, 5).map((r) => (
              <li key={r.id} className="flex flex-col gap-1 py-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={r.state === "failed" ? "destructive" : "secondary"}>{COPY.states[r.state]}</Badge>
                  <span className="text-foreground">{COPY.kinds[r.kind] ?? r.kind}</span>
                  {r.trigger === "automatic" ? (
                    <Badge variant="outline" title={COPY.automaticHint}>{COPY.automatic}</Badge>
                  ) : null}
                  <span className="text-muted-foreground">· {r.dataset}</span>
                  <span className="text-muted-foreground">{when(r.requested_at)}</span>
                  {r.result?.documents !== undefined ? (
                    <span className="text-muted-foreground">· {r.result.documents} documents read</span>
                  ) : null}
                </div>
                {r.state === "failed" && r.error ? (
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <p className="min-w-0 flex-1 break-words text-destructive">{r.error}</p>
                    {canSync ? (
                      <Button size="sm" variant="ghost" disabled={pending} onClick={() => dismiss(r.id)}>
                        {pending ? COPY.dismissing : COPY.dismiss}
                      </Button>
                    ) : null}
                  </div>
                ) : null}
                {r.state === "done" && r.result?.skipped ? <p className="text-muted-foreground">{COPY.skipped}</p> : null}
                {r.state === "done" && !r.result?.skipped && r.result?.loaded?.length === 0 ? (
                  <p className="text-muted-foreground">{COPY.nothingFound}</p>
                ) : null}
                {r.state === "done" && r.result?.loaded?.length ? (
                  <ul className="flex flex-col gap-0.5 pl-1">
                    {r.result.loaded.map((f) => (
                      <li key={f.id}>
                        <Link href={`/spec/${f.id}`} className="text-foreground underline-offset-2 hover:underline">
                          {f.frame}
                        </Link>{" "}
                        <span className="text-muted-foreground">· {f.items} {f.items === 1 ? "change" : "changes"}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
