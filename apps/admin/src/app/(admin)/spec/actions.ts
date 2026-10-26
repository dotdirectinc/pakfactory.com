"use server";

import { revalidatePath, updateTag } from "next/cache";
import { SPEC_RULES_TAG } from "@/lib/spec/cache";
import { ADMIN_SPEC_COPY } from "@/lib/copy/spec";
import { decideChangeset, dismissSyncRun, getOptionCandidates, getOptionEdits, saveOptionEdit, type OptionCandidates, type OptionEditKind, type OptionEditState, getSyncRun, requestSyncRun, setDocumentExclusion, setRelationsOwner, type NotionFieldGroup, type RelationsOwnerValue } from "@/lib/spec/registry-api";

/** `stillRunning`: the gateway gave up on an approve that the server may yet finish (QA 2026-10-26). */
export type DecisionResult = { ok: true } | { ok: false; error: string; stillRunning?: boolean };

/**
 * Decide a frame, as the signed-in person.
 *
 * A server action rather than a fetch from the browser: the access token stays on
 * the server, and the capability is checked by the backend against the grant rather
 * than by anything this app could be talked out of.
 *
 * The error is returned rather than thrown. Every way this fails is something the
 * reviewer needs to read — their grant was revoked, someone else decided the frame
 * first, the registry is down — and an error boundary would replace all of them with
 * the same blank page.
 */
export async function decideFrameAction(
  id: string,
  decision: "approve" | "discard",
  revision?: number,
): Promise<DecisionResult> {
  const res = await decideChangeset(id, decision, revision);
  if (!res.ok) {
    // nginx cuts the request at 30 s, but the server keeps going and can approve minutes later. Saying
    // "failed" would invite a second Approve, so the page says it may still go through and re-checks.
    if (decision === "approve" && (res.status === 502 || res.status === 503 || res.status === 504)) {
      revalidatePath(`/spec/${id}`);
      return { ok: false, error: ADMIN_SPEC_COPY.approveStillRunning, stillRunning: true };
    }
    return { ok: false, error: res.error };
  }

  // Both the list and this frame change: an approved frame leaves the pending list.
  // An approved frame may have changed the rules (a Spec System edit is pushed to Sanity at once): the
  // rules views must not keep serving the old answer.
  if (decision === "approve") updateTag(SPEC_RULES_TAG);
  revalidatePath("/spec");
  revalidatePath(`/spec/${id}`);
  return { ok: true };
}

/**
 * Request a sync run (PROD-2751) — Sync Sanity or Sync from Notion — as the signed-in person. The
 * backend checks `catalog.sync` against their grant and refuses while another run is open.
 */
export async function requestSyncAction(
  kind: "sanity" | "notion",
  dataset: string,
  includeSku = false,
  notionFields?: readonly NotionFieldGroup[],
): Promise<{ ok: true; runId: string } | { ok: false; error: string }> {
  const res = await requestSyncRun(kind, dataset, includeSku, notionFields);
  if (!res.ok) return { ok: false, error: res.error };
  revalidatePath("/spec");
  return { ok: true, runId: res.data.id };
}

/** Where a run stands, for the shell's watcher: open, or what it produced once it ended. */
export type SyncRunStatus =
  | { open: true }
  | { open: false; kind: "sanity" | "notion"; failed: boolean; error: string | null; frames: number; items: number };

export async function syncRunStatusAction(id: string): Promise<SyncRunStatus | null> {
  const res = await getSyncRun(id);
  if (!res.ok) return null;
  const run = res.data;
  if (run.state === "requested" || run.state === "running") return { open: true };
  const loaded = run.result?.loaded ?? [];
  return {
    open: false,
    kind: run.kind,
    failed: run.state === "failed",
    error: run.error,
    frames: loaded.length,
    items: loaded.reduce((n, f) => n + (f.items ?? 0), 0),
  };
}

/**
 * Hand the catalog relations to the Spec System or back to Studio (PROD-2988 / PROD-3008), as the
 * signed-in admin. The backend checks `relations.owner`, sets the registry and tells Studio.
 */
export async function setRelationsOwnerAction(dataset: string, rules: RelationsOwnerValue, structure: RelationsOwnerValue, note: string): Promise<DecisionResult> {
  const res = await setRelationsOwner({ dataset, rules, structure, ...(note.trim() ? { note: note.trim() } : {}) });
  if (!res.ok) return { ok: false, error: res.error };
  revalidatePath("/spec");
  return { ok: true };
}

/** Dismiss a finished sync run from the panel (2026-10-06: failed syncs should not stay). */
export async function dismissSyncAction(id: string): Promise<DecisionResult> {
  const res = await dismissSyncRun(id);
  if (!res.ok) return { ok: false, error: res.error };
  revalidatePath("/spec");
  return { ok: true };
}

/** Exclude (or include) every row of one document in a pending sync frame (PROD-2751). */
export async function setExclusionAction(changesetId: string, document: string, excluded: boolean): Promise<DecisionResult> {
  const res = await setDocumentExclusion(changesetId, document, excluded);
  if (!res.ok) return { ok: false, error: res.error };
  revalidatePath(`/spec/${changesetId}`);
  return { ok: true };
}

/** An option Register frame's shared edit state (PROD-3167), read by the page every 3 s while it is open. */
export async function optionEditStateAction(changesetId: string): Promise<{ ok: true; data: OptionEditState } | { ok: false; error: string }> {
  const res = await getOptionEdits(changesetId);
  return res.ok ? { ok: true, data: res.data } : { ok: false, error: res.error };
}

/** Every row that could be added to an option Register frame — read once when it opens. */
export async function optionCandidatesAction(changesetId: string): Promise<{ ok: true; data: OptionCandidates } | { ok: false; error: string }> {
  const res = await getOptionCandidates(changesetId);
  return res.ok ? { ok: true, data: res.data } : { ok: false, error: res.error };
}

/** Save one tick / untick (and its reason) on an option Register frame, as the signed-in person. */
export async function saveOptionEditAction(
  changesetId: string,
  edit: { kind: OptionEditKind; target: string; selected: boolean; reason?: string | null },
): Promise<{ ok: true; revision: number | null } | { ok: false; error: string }> {
  const res = await saveOptionEdit(changesetId, edit);
  return res.ok ? { ok: true, revision: res.data.revision } : { ok: false, error: res.error };
}
