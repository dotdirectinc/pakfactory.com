"use server";

import { revalidatePath } from "next/cache";
import { decideSpecMappings, type LibraryDecision } from "@/lib/spec/registry-api";

export type MappingActionResult = { ok: true; recorded: number } | { ok: false; error: string };

/**
 * Record one decision for the chosen maps, as the signed-in person (PLAT-52). A server action so the
 * access token stays on the server; the backend checks `spec.review` and the database enforces the
 * rules (a note for reject and defer, decisions append-only).
 */
export async function decideMappingsAction(decision: LibraryDecision, note: string | null, ids: number[]): Promise<MappingActionResult> {
  const res = await decideSpecMappings(decision, note, ids);
  revalidatePath("/spec/mapping");
  if (!res.ok) return { ok: false, error: res.error };
  return { ok: true, recorded: res.data.recorded };
}
