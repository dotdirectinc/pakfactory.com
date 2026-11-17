"use server";

import { revalidatePath } from "next/cache";
import { decideLibraryChange, decideLibraryItems, type LibraryDecision } from "@/lib/spec/registry-api";

export type LibraryActionResult = { ok: true; recorded?: number } | { ok: false; error: string };

/**
 * Record one decision for one or many records, as the signed-in person (PFP-124). A server action so
 * the access token stays on the server; the backend checks `spec.review` and the database enforces the
 * review rules (a note for reject/defer, records in the version).
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

/**
 * Decide a held change to an approved record (PLAT-81). Approve applies it (the previous values are
 * kept in the record's history); reject keeps the approved values; defer leaves it for the next import.
 */
export async function decideLibraryChangeAction(
  item: number,
  decision: LibraryDecision,
  note: string | null,
): Promise<LibraryActionResult> {
  const res = await decideLibraryChange(item, decision, note);
  if (!res.ok) return { ok: false, error: res.error };
  revalidatePath("/spec/library", "layout");
  return { ok: true, recorded: 1 };
}
