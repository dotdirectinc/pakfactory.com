import Link from "next/link";
import type { ReactNode } from "react";
import { Badge } from "@pakfactory/ui/components/badge";
import { LocalTime } from "@pakfactory/ui/components/local-time";
import { AutoRefresh } from "@/components/layout/auto-refresh";
import { SpecChangesetTable, describeFrame, sourceLabel } from "@/components/spec/spec-changeset-table";
import { RulesDriftLine, StructureDriftLine } from "@/components/spec/spec-sync-history";
import {
  approvedFrames,
  listChangesetsPage,
  listDraftChangesets,
  listSyncRuns,
  listSyncWriteProblems,
  type SyncRun,
} from "@/lib/spec/registry-api";
import { dependsOn } from "@/lib/spec/prerequisites";
import { failedRuns, isOpen, pausedSyncs, recentRuns } from "@/lib/spec/sync-runs";
import { ADMIN_SPEC_REGISTRY_COPY as COPY, ADMIN_SPEC_SYNC_COPY as SYNC, ADMIN_SPEC_SYNC_HISTORY_COPY as HISTORY } from "@/lib/copy/spec";
import { RegistrySyncControl } from "./registry-sync-control";
import { RegistryDismissButton } from "./registry-dismiss-button";

/**
 * The Registry's sections (PROD-3115). Each reads only what it shows and is rendered in its own
 * Suspense boundary, so the page appears at once and each section fills in as its read returns —
 * in the order a reviewer needs them: what is waiting, what went wrong, what happened lately.
 */

const RECENT = 3;

function SectionError({ what, error }: { what: string; error: string }) {
  return (
    <p role="alert" className="rounded-md border border-border bg-muted/30 px-3 py-2 text-sm text-destructive">
      {COPY.sectionError(what)} <span className="text-muted-foreground">({error})</span>
    </p>
  );
}

export function Section({ title, count, aside, children }: { title: string; count?: number; aside?: ReactNode; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold text-foreground">
          {title}
          {count !== undefined ? <span className="ml-1.5 font-normal tabular-nums text-muted-foreground">{count}</span> : null}
        </h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

/** Header: Sync Changes, disabled while a sync runs (and the page refreshes itself until it ends). */
export async function SyncControlSection({ canSync }: { canSync: boolean }) {
  const runs = await listSyncRuns();
  const open = runs.ok && runs.data.some(isOpen);
  return (
    <>
      <AutoRefresh active={open} />
      <RegistrySyncControl canSync={canSync} open={open} />
    </>
  );
}

/** #1 — the frames waiting for a decision, ready ones first. */
export async function WaitingSection() {
  const [drafts, runs] = await Promise.all([listDraftChangesets(), listSyncRuns()]);
  if (!drafts.ok) return <Section title={COPY.waitingTitle}><SectionError what={COPY.waitingTitle} error={drafts.error} /></Section>;
  const deps = drafts.data.flatMap(dependsOn);
  const approved = deps.length ? await approvedFrames(deps) : new Set<string>();
  // Only while a frame still waits: once it is decided, the next automatic run loads again.
  const paused = runs.ok && drafts.data.length ? pausedSyncs(runs.data) : [];
  return (
    <Section title={COPY.waitingTitle} count={drafts.data.length}>
      {paused.map((p) => (
        <div key={p.dataset} role="status" className="flex flex-col gap-0.5 rounded-md border border-amber-500/40 bg-amber-500/5 px-3 py-2 text-sm">
          <span className="font-medium text-foreground">
            {COPY.syncPaused(p.dataset, p.skipped)} <LocalTime iso={p.since} className="font-normal text-muted-foreground" />
          </span>
          <span className="text-muted-foreground">{COPY.syncPausedLead}</span>
        </div>
      ))}
      {drafts.data.length === 0 ? (
        <p className="rounded-md border border-dashed border-border px-3 py-3 text-sm text-muted-foreground">{COPY.waitingNone}</p>
      ) : (
        <SpecChangesetTable changesets={drafts.data} approved={approved} />
      )}
    </Section>
  );
}

/** #2 — failed syncs and approved changes that did not reach Sanity. Nothing at all when there are none. */
export async function AttentionSection({ canSync }: { canSync: boolean }) {
  const [runs, problems] = await Promise.all([listSyncRuns(), listSyncWriteProblems()]);
  const failed = runs.ok ? failedRuns(runs.data) : [];
  const notWritten = problems.ok ? problems.data : [];
  if (!failed.length && !notWritten.length) return null;
  return (
    <Section title={COPY.attentionTitle} count={failed.length + notWritten.length}>
      <div className="flex flex-col divide-y divide-destructive/20 rounded-md border border-destructive/40 bg-destructive/5 text-sm">
        {failed.map((r) => (
          <div key={r.id} className="flex flex-wrap items-start justify-between gap-2 px-3 py-2">
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="font-medium text-destructive">
                {COPY.syncFailed(SYNC.kinds[r.kind] ?? r.kind)} · <LocalTime iso={r.requested_at} className="font-normal text-muted-foreground" />
              </span>
              {r.error ? <span className="break-words text-muted-foreground">{r.error}</span> : null}
            </div>
            {canSync ? <RegistryDismissButton runId={r.id} /> : null}
          </div>
        ))}
        {notWritten.length ? (
          <div className="flex flex-col gap-1 px-3 py-2">
            <span className="font-medium text-destructive">{SYNC.problemsTitle(notWritten.length)}</span>
            <span className="text-muted-foreground">{SYNC.problemsLead}</span>
            <ul className="mt-1 flex flex-col gap-1">
              {notWritten.slice(0, 10).map((p) => (
                <li key={p.item_id} className="flex flex-wrap gap-x-2">
                  <span className="text-foreground">
                    {p.title} · {p.fields.join(", ")} — {SYNC.problemStates[p.state]}
                  </span>
                  <Link href={`/spec/${p.changeset_id}`} className="text-xs text-muted-foreground underline-offset-2 hover:underline">
                    {p.frame}
                  </Link>
                </li>
              ))}
              {notWritten.length > 10 ? (
                <li>
                  <Link href="/spec/syncs" className="text-xs text-muted-foreground underline-offset-2 hover:underline">{HISTORY.link} →</Link>
                </li>
              ) : null}
            </ul>
          </div>
        ) : null}
      </div>
    </Section>
  );
}

function SyncRunRow({ r, showDrift }: { r: SyncRun; showDrift: boolean }) {
  const loaded = r.result?.loaded ?? [];
  return (
    <li className="flex flex-col gap-1 px-3 py-2">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={isOpen(r) ? "default" : "secondary"}>{SYNC.states[r.state]}</Badge>
        <span className="text-foreground">{SYNC.kinds[r.kind] ?? r.kind}</span>
        {r.trigger === "automatic" ? <Badge variant="outline" title={SYNC.automaticHint}>{SYNC.automatic}</Badge> : null}
        <LocalTime iso={r.requested_at} className="text-xs text-muted-foreground" />
      </div>
      {r.state === "requested" && r.waiting_on_writes ? <p className="text-xs text-muted-foreground">{SYNC.waitingOnWrites(r.waiting_on_writes)}</p> : null}
      {r.state === "done" && r.result?.skipped ? <p className="text-xs text-muted-foreground">{SYNC.skipped}</p> : null}
      {r.state === "done" && !r.result?.skipped ? (
        loaded.length === 0 ? (
          <p className="text-xs text-muted-foreground">{SYNC.nothingFound}</p>
        ) : (
          <p className="text-xs text-muted-foreground">
            {COPY.frames(loaded.length)}:{" "}
            {loaded.map((f, i) => (
              <span key={f.id}>
                {i ? ", " : ""}
                <Link href={`/spec/${f.id}`} className="text-foreground underline-offset-2 hover:underline">{f.frame}</Link>
              </span>
            ))}
          </p>
        )
      ) : null}
      {showDrift ? (
        <div className="text-xs">
          <RulesDriftLine drift={r.result?.report?.rulesDrift} />
          <StructureDriftLine drift={r.result?.report?.structureDrift} />
        </div>
      ) : null}
    </li>
  );
}

/** #3 — the latest syncs and the latest approvals, three of each. */
export async function RecentSection() {
  const [runs, approved] = await Promise.all([
    listSyncRuns(),
    listChangesetsPage({ state: "approved", order: "approved", limit: RECENT }),
  ]);
  const recent = runs.ok ? recentRuns(runs.data, RECENT) : [];
  const latestDone = recent.find((r) => r.state === "done" && !r.result?.skipped)?.id;
  return (
    <Section title={COPY.recentTitle}>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-baseline justify-between gap-2">
            <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{COPY.recentSyncs}</h3>
            <Link href="/spec/syncs" className="text-xs text-muted-foreground underline-offset-2 hover:underline">{COPY.allSyncs} →</Link>
          </div>
          {!runs.ok ? (
            <SectionError what={COPY.recentSyncs} error={runs.error} />
          ) : recent.length === 0 ? (
            <p className="text-sm text-muted-foreground">{SYNC.none}</p>
          ) : (
            <ul className="divide-y divide-border rounded-md border border-border text-sm">
              {recent.map((r) => <SyncRunRow key={r.id} r={r} showDrift={r.id === latestDone} />)}
            </ul>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{COPY.recentApproved}</h3>
          {!approved.ok ? (
            <SectionError what={COPY.recentApproved} error={approved.error} />
          ) : approved.data.length === 0 ? (
            <p className="text-sm text-muted-foreground">{COPY.noneApproved}</p>
          ) : (
            <ul className="divide-y divide-border rounded-md border border-border text-sm">
              {approved.data.map((c) => {
                const what = describeFrame(c);
                return (
                  <li key={c.id} className="flex flex-col gap-0.5 px-3 py-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link href={`/spec/${c.id}`} className="font-medium text-foreground hover:underline">{c.frame}</Link>
                      <Badge variant="outline">{sourceLabel(c.source)}</Badge>
                    </div>
                    {what ? <p className="text-xs text-muted-foreground">{what}</p> : null}
                    <p className="text-xs text-muted-foreground">
                      {COPY.approvedAt} {c.approved_at ? <LocalTime iso={c.approved_at} /> : "—"}
                      {c.item_count !== undefined ? ` · ${HISTORY.changes(c.item_count)}` : null}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </Section>
  );
}
