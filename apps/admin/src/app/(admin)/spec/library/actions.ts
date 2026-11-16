"use server";

import { revalidatePath } from "next/cache";
import { approveLibraryVersion, decideLibraryItems, type LibraryDecision } from "@/lib/spec/registry-api";

export type LibraryActionResult = { ok: true; recorded?: number } | { ok: false; error: string };

/**
 * Record one decision for one or many records, as the signed-in person (PFP-124). A server action so
 * the access token stays on the server; the backend checks `spec.review` and the database enforces the
 * review rules (a note for reject/defer, records in the version, no decisions after approval).
 */
export async function decideLibraryAction(
  version: number,
  decision: LibraryDecision,
  note: string | null,
  items: { collection: string; sourceId: string }[],
): Promise<LibraryActionResult> {
  const res = await decideLibraryItems(version, decision, note, items);
  if (!res.ok) return { ok: false, error: res.error };
  revalidatePath("/spec/library", "layout");
  return { ok: true, recorded: res.data.recorded };
}

/** Approve the version once nothing is pending or deferred; the backend refuses it otherwise. */
export async function approveLibraryVersionAction(version: number): Promise<LibraryActionResult> {
  const res = await approveLibraryVersion(version);
  if (!res.ok) return { ok: false, error: res.error };
  revalidatePath("/spec/library", "layout");
  return { ok: true };
}
