import Link from "next/link";
import { Badge } from "@pakfactory/ui/components/badge";
import type { SyncHistoryFrame, SyncHistoryRun } from "@/lib/spec/registry-api";
import { ADMIN_SPEC_SYNC_COPY as SYNC, ADMIN_SPEC_SYNC_HISTORY_COPY as COPY } from "@/lib/copy/spec";

const when = (iso: string) => new Date(iso).toLocaleString("en-CA", { dateStyle: "medium", timeStyle: "short" });

function FrameDecision({ f }: { f: SyncHistoryFrame }) {
  if (f.state === "approved" && f.approved_at)
    return <>{COPY.decidedBy(COPY.frameStates.approved, f.approved_by?.name ?? COPY.someone, when(f.approved_at))}</>;
  if (f.state === "discarded" && f.discarded_at)
    return <>{COPY.decidedBy(COPY.frameStates.discarded, f.discarded_by?.name ?? COPY.someone, when(f.discarded_at))}</>;
  return <>{COPY.frameStates[f.state]}</>;
}

/** The proven result of an approved frame: its latest re-check (backend recheck.ts). */
function Recheck({ f }: { f: SyncHistoryFrame }) {
  if (f.state !== "approved") return null;
  const r = f.recheck;
  if (!r) return <p className="text-xs text-muted-foreground">{COPY.recheckPending}</p>;
  if (r.checked === 0) return <p className="text-xs text-muted-foreground">{COPY.recheckNothing}</p>;
  if (r.still_differ === 0) return <p className="text-xs text-emerald-700 dark:text-emerald-400">✓ {COPY.recheckOk(r.checked)} · {when(r.at)}</p>;
  return (
    <div className="text-xs text-destructive">
      <p>{COPY.recheckDiffer(r.still_differ, r.checked)} · {when(r.at)}</p>
      {r.items.length ? (
        <p className="text-muted-foreground">{r.items.map((i) => i.title ?? COPY.unnamedRow).join(", ")}</p>
      ) : null}
    </div>
  );
}

/** One sync in the history: who ran it, what it produced, what was decided, whether it landed. */
export function SpecSyncHistoryRun({ run }: { run: SyncHistoryRun }) {
  return (
    <li className="flex flex-col gap-2 py-3">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Badge variant={run.state === "failed" ? "destructive" : "secondary"}>{SYNC.states[run.state]}</Badge>
        <span className="font-medium text-foreground">{SYNC.kinds[run.kind] ?? run.kind}</span>
        <span className="text-muted-foreground">· {run.dataset}</span>
        <span className="text-muted-foreground">{when(run.requested_at)}</span>
        {run.trigger === "automatic" ? (
          <Badge variant="outline" title={SYNC.automaticHint}>{SYNC.automatic}</Badge>
        ) : (
          <span className="text-muted-foreground">{COPY.requestedBy(run.requested_by?.name ?? COPY.someone)}</span>
        )}
        {run.documents !== null ? <span className="text-muted-foreground">· {COPY.documents(run.documents)}</span> : null}
      </div>
      {run.state === "failed" && run.error ? <p className="break-words text-sm text-destructive">{run.error}</p> : null}
      {run.recheck_error ? <p className="text-xs text-muted-foreground">{COPY.recheckError(run.recheck_error)}</p> : null}
      {run.state === "done" && run.skipped ? <p className="text-sm text-muted-foreground">{SYNC.skipped}</p> : null}
      {run.state === "done" && !run.skipped && run.frames.length === 0 ? <p className="text-sm text-muted-foreground">{COPY.noFrames}</p> : null}
      {run.frames.length ? (
        <ul className="flex flex-col gap-2 border-l border-border pl-3">
          {run.frames.map((f) => (
            <li key={f.id} className="flex flex-col gap-0.5 text-sm">
              <div className="flex flex-wrap items-baseline gap-x-2">
                <Link href={`/spec/${f.id}`} className="text-foreground underline-offset-2 hover:underline">
                  {f.frame}
                </Link>
                <span className="text-muted-foreground">
                  · {COPY.changes(f.items)}
                  {f.excluded ? ` · ${COPY.excluded(f.excluded)}` : ""}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                <FrameDecision f={f} />
                {f.state === "approved" && f.writes_to_sanity ? ` · ${COPY.writes(f.writes_to_sanity)}` : ""}
              </p>
              <Recheck f={f} />
            </li>
          ))}
        </ul>
      ) : null}
    </li>
  );
}
