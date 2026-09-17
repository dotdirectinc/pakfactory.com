import type { ChangesetSummary } from "@/lib/spec/registry-api";

/**
 * The frames a frame needs approved before it, that are not yet.
 *
 * Approving out of order fails on a foreign key deep inside the transaction — the whole
 * approval rolls back, so nothing breaks, but the reviewer learns the order by hitting
 * it. Showing it up front is the difference between a rule the software knows and a rule
 * the person has to remember.
 *
 * The generator's `dependsOn` is advisory: the database's foreign keys are the real
 * guard, and the backend refuses either way. This exists so the button is honest before
 * it is pressed, not as a substitute for that.
 */
export function dependsOn(cs: ChangesetSummary): string[] {
  const raw = (cs.summary ?? {}) as { dependsOn?: unknown };
  return Array.isArray(raw.dependsOn)
    ? raw.dependsOn.filter((f): f is string => typeof f === "string")
    : [];
}

export function blockedBy(cs: ChangesetSummary, all: ChangesetSummary[]): string[] {
  const approved = new Set(all.filter((c) => c.state === "approved").map((c) => c.frame));
  return dependsOn(cs).filter((f) => !approved.has(f));
}

/**
 * Ready first, then blocked, each alphabetically — the order they can be worked through.
 *
 * `all` is every frame including approved ones, not just the ones being listed: a
 * prerequisite stops blocking precisely when it leaves the pending list.
 */
export function byReadiness(
  listed: ChangesetSummary[],
  all: ChangesetSummary[],
): ChangesetSummary[] {
  return [...listed].sort((a, b) => {
    const ab = blockedBy(a, all).length;
    const bb = blockedBy(b, all).length;
    if (ab !== bb) return ab - bb;
    return a.frame.localeCompare(b.frame);
  });
}
