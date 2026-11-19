"use server";

import { revalidatePath } from "next/cache";
import {
  decideLibraryChange, decideLibraryItems, decideSpecEdit, setProductTypeBaseline, type LibraryDecision,
} from "@/lib/spec/registry-api";
import { recordBatches, type ChangeRoute } from "@/lib/spec/library-changes";

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

/**
 * Approve the records ticked in a product type's approve dialog (PLAT-81): one decision call per
 * library version, so every record still gets its own decision row. Stops at the first refusal and
 * says how many were already recorded; decisions are append-only, so a retry is safe.
 */
export async function approveBundleAction(
  batches: { version: number; items: { collection: string; sourceId: string }[] }[],
  note: string | null,
): Promise<LibraryActionResult> {
  let recorded = 0;
  for (const b of batches) {
    const res = await decideLibraryItems(b.version, "approve", note, b.items);
    if (!res.ok) {
      revalidatePath("/spec/library", "layout");
      return { ok: false, error: recorded > 0 ? `${res.error} (${recorded} already approved)` : res.error };
    }
    recorded += res.data.recorded;
  }
  revalidatePath("/spec/library", "layout");
  return { ok: true, recorded };
}

/**
 * Decide records listed on a product type's changes (PLAT-85), each where it belongs: a proposal on the
 * proposal (admin only; the backend answers 403 otherwise), a held change on the held change, anything
 * else as a review decision on its library version. One call per proposal or held change and one per
 * version, so every record still gets its own decision row. Stops at the first refusal.
 */
export async function decideChangesAction(
  routes: ChangeRoute[],
  decision: LibraryDecision,
  note: string | null,
): Promise<LibraryActionResult> {
  let recorded = 0;
  const fail = (error: string): LibraryActionResult => {
    revalidatePath("/spec/library", "layout");
    return { ok: false, error: recorded > 0 ? `${error} (${recorded} already recorded)` : error };
  };
  for (const r of routes) {
    if (r.kind === "record") continue;
    const res = r.kind === "edit" ? await decideSpecEdit(r.edit, decision, note) : await decideLibraryChange(r.item, decision, note);
    if (!res.ok) return fail(res.error);
    recorded += 1;
  }
  for (const b of recordBatches(routes)) {
    const res = await decideLibraryItems(b.version, decision, note, b.items);
    if (!res.ok) return fail(res.error);
    recorded += res.data.recorded;
  }
  revalidatePath("/spec/library", "layout");
  return { ok: true, recorded };
}

/** Set as baseline for one product type (ADR-028 D7, admin only). */
export async function setBaselineAction(
  productType: string,
): Promise<{ ok: true; records: number; shared: number; skipped: number } | { ok: false; error: string }> {
  const res = await setProductTypeBaseline(productType);
  revalidatePath("/spec/library", "layout");
  if (!res.ok) return { ok: false, error: res.error };
  return { ok: true, records: res.data.records, shared: res.data.shared, skipped: res.data.skipped };
}
