import { notFound } from "next/navigation";
import { fetchSpecMe, type SpecMe } from "@/lib/spec/registry-api";

/**
 * Staff without a registry grant get 404, not 403 (PROD-2505 acceptance).
 *
 * 403 would confirm that a spec surface exists and that this person is merely not
 * allowed into it. 404 says nothing at all, which is the right answer for someone
 * who has no business knowing the registry is here — the admin app is shared with
 * sales staff who will never hold a grant.
 *
 * The check is the BACKEND's answer, not a local role guess: the grant lives in the
 * registry database, and a second opinion computed here could disagree with the one
 * that actually gates the write.
 */
export async function requireRegistryGrant(): Promise<SpecMe> {
  const me = await fetchSpecMe();
  if (!me?.authenticated || !me.role) notFound();
  return me;
}

/** Whether this person may decide a frame, as opposed to only reading one. */
export function canApprove(me: SpecMe): boolean {
  return me.capabilities.includes("value.approve");
}
