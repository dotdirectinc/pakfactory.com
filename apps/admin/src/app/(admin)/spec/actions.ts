"use server";

import { revalidatePath } from "next/cache";
import { decideChangeset, dismissSyncRun, requestSyncRun, setDocumentExclusion } from "@/lib/spec/registry-api";

export type DecisionResult = { ok: true } | { ok: false; error: string };

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
): Promise<DecisionResult> {
  const res = await decideChangeset(id, decision);
  if (!res.ok) return { ok: false, error: res.error };

  // Both the list and this frame change: an approved frame leaves the pending list.
  revalidatePath("/spec");
  revalidatePath(`/spec/${id}`);
  return { ok: true };
}

/**
 * Request a sync run (PROD-2751) — Sync Sanity or Sync from Notion — as the signed-in person. The
 * backend checks `catalog.sync` against their grant and refuses while another run is open.
 */
export async function requestSyncAction(kind: "sanity" | "notion", dataset: string): Promise<DecisionResult> {
  const res = await requestSyncRun(kind, dataset);
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
