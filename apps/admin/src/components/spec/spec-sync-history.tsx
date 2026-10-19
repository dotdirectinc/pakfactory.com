import type { ReactNode } from "react";
import Link from "next/link";
import { Badge } from "@pakfactory/ui/components/badge";
import { getSyncRunApplied, type ContentDrift, type RulesDrift, type SyncApplied, type SyncHistoryFrame, type SyncHistoryRun } from "@/lib/spec/registry-api";
import { describeApplied } from "@/lib/spec/sync-applied";
import { ADMIN_SPEC_SYNC_COPY as SYNC, ADMIN_SPEC_SYNC_HISTORY_COPY as COPY } from "@/lib/copy/spec";
import { LocalTime } from "@pakfactory/ui/components/local-time";

function FrameDecision({ f }: { f: SyncHistoryFrame }) {
  if (f.state === "approved" && f.approved_at)
    return <>{COPY.decidedBy(COPY.frameStates.approved, f.approved_by?.name ?? COPY.someone)}<LocalTime iso={f.approved_at} /></>;
  if (f.state === "discarded" && f.discarded_at)
    return <>{COPY.decidedBy(COPY.frameStates.discarded, f.discarded_by?.name ?? COPY.someone)}<LocalTime iso={f.discarded_at} /></>;
  return <>{COPY.frameStates[f.state]}</>;
}

/** The proven result of an approved frame: its latest re-check (backend recheck.ts). */
function Recheck({ f }: { f: SyncHistoryFrame }) {
  if (f.state !== "approved") return null;
  const r = f.recheck;
  if (!r) return <p className="text-xs text-muted-foreground">{COPY.recheckPending}</p>;
  if (r.checked === 0) return <p className="text-xs text-muted-foreground">{COPY.recheckNothing}</p>;
  if (r.still_differ === 0) return <p className="text-xs text-emerald-700 dark:text-emerald-400">✓ {COPY.recheckOk(r.checked)} · <LocalTime iso={r.at} /></p>;
  return (
    <div className="text-xs text-destructive">
      <p>{COPY.recheckDiffer(r.still_differ, r.checked)} · <LocalTime iso={r.at} /></p>
      {r.items.length ? (
        <p className="text-muted-foreground">{r.items.map((i) => i.title ?? COPY.unnamedRow).join(", ")}</p>
      ) : null}
    </div>
  );
}

/**
 * One sync in the history: who ran it, what it applied, what it produced, what was decided, whether it
 * landed. `openHref` / `closeHref` toggle its applied changes, which `applied` renders when open.
 */
export function SpecSyncHistoryRun({
  run,
  openHref,
  closeHref,
  applied,
}: {
  run: SyncHistoryRun;
  openHref?: string;
  closeHref?: string;
  applied?: ReactNode;
}) {
  return (
    <li id={`run-${run.id}`} className="flex flex-col gap-2 py-3">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Badge variant={run.state === "failed" ? "destructive" : "secondary"}>{SYNC.states[run.state]}</Badge>
        <span className="font-medium text-foreground">{SYNC.kinds[run.kind] ?? run.kind}</span>
        <span className="text-muted-foreground">· {run.dataset}</span>
        <LocalTime iso={run.requested_at} className="text-muted-foreground" />
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
      <RulesDriftLine drift={run.state === "done" ? run.rules_drift : null} />
      <StructureDriftLine drift={run.state === "done" ? run.structure_drift : null} />
      <ContentDriftLine drift={run.state === "done" ? run.content_drift : null} />
      <AppliedLine applied={run.state === "done" ? run.applied : null} openHref={openHref} closeHref={closeHref} />
      {applied}
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

/** Sync Changes: content Sanity owns where the registry differed when the run read it (PROD-3117). */
export function ContentDriftLine({ drift }: { drift: ContentDrift | null | undefined }) {
  if (!drift) return null;
  return (
    <p className="text-sm text-muted-foreground" title={COPY.contentDriftHint}>
      {drift.total ? COPY.contentDrift(drift.total, drift.byKind) : COPY.contentMatch}
    </p>
  );
}

/** Sync Changes: what the run applied itself (PROD-3118), with a toggle for the list. */
function AppliedLine({ applied, openHref, closeHref }: { applied: SyncApplied | null | undefined; openHref?: string; closeHref?: string }) {
  if (!applied || (applied.planned === 0 && !applied.skipped)) return null;
  return (
    <div className="flex flex-col gap-0.5 text-sm">
      <p className="flex flex-wrap items-baseline gap-x-2" title={COPY.appliedHint}>
        <span className="text-foreground">{COPY.applied(applied.applied)}</span>
        {applied.has_items && openHref ? (
          <Link href={openHref} scroll={false} className="text-xs font-medium text-primary underline-offset-2 hover:underline">{COPY.showApplied}</Link>
        ) : null}
        {closeHref ? (
          <Link href={closeHref} scroll={false} className="text-xs font-medium text-primary underline-offset-2 hover:underline">{COPY.hideApplied}</Link>
        ) : null}
      </p>
      {applied.skipped ? <p className="text-xs text-muted-foreground">{COPY.appliedSkipped(applied.skipped)}</p> : null}
      {applied.failed.length ? (
        <p className="text-xs text-destructive">
          {COPY.appliedFailed(applied.failed.length)}: {applied.failed.slice(0, 5).map((f) => `${f.title ?? f.key} (${f.error})`).join("; ")}
        </p>
      ) : null}
    </div>
  );
}

/** One run's applied changes, read when the run is opened (PROD-3119). */
export async function SpecSyncAppliedChanges({ runId }: { runId: string }) {
  const res = await getSyncRunApplied(runId);
  if (!res.ok) return <p role="alert" className="text-xs text-destructive">{COPY.appliedUnreachable} ({res.error})</p>;
  const items = res.data?.items ?? [];
  return (
    <div className="flex flex-col gap-1 border-l border-border pl-3">
      <ul className="flex flex-col gap-0.5 text-sm">
        {items.map((it, n) => {
          const d = describeApplied(it);
          return (
            <li key={`${it.entity_type}-${it.target_id ?? n}-${n}`} className="flex flex-wrap gap-x-2">
              <span className="text-foreground">{d.record}</span>
              <span className="text-muted-foreground">{d.what}</span>
            </li>
          );
        })}
      </ul>
      {res.data && items.length < res.data.applied ? <p className="text-xs text-muted-foreground">{COPY.appliedMore(items.length, res.data.applied)}</p> : null}
    </div>
  );
}

/** Sync Changes: whether records' parents match between the registry and Sanity (PROD-3006). */
export function StructureDriftLine({ drift }: { drift: RulesDrift | null | undefined }) {
  if (!drift) return null;
  return (
    <p className={`text-sm ${drift.total ? "text-amber-700 dark:text-amber-400" : "text-muted-foreground"}`} title={COPY.structureDriftHint}>
      {drift.total ? COPY.structureDrift(drift.total, drift.byKind) : COPY.structureMatch}
    </p>
  );
}

/** Sync Changes: whether the registry's customization rules match Sanity (PROD-2986). */
export function RulesDriftLine({ drift }: { drift: RulesDrift | null | undefined }) {
  if (!drift) return null;
  return (
    <p className={`text-sm ${drift.total ? "text-amber-700 dark:text-amber-400" : "text-muted-foreground"}`} title={COPY.rulesDriftHint}>
      {drift.total ? COPY.rulesDrift(drift.total, drift.byKind) : COPY.rulesMatch}
    </p>
  );
}
