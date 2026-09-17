"use server";

import { revalidatePath } from "next/cache";
import { decideChangeset } from "@/lib/spec/registry-api";

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
