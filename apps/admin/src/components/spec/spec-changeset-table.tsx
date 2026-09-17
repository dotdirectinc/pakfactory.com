import Link from "next/link";
import { Badge } from "@pakfactory/ui/components/badge";
import type { ChangesetSummary } from "@/lib/spec/registry-api";
import { blockedBy, byReadiness } from "@/lib/spec/prerequisites";

/**
 * A frame is only reviewable as a whole, so this lists frames and not items: the
 * decision applies to every row in one, and a per-item view would imply otherwise.
 */
function itemTotal(cs: ChangesetSummary): number {
  return (cs.item_counts ?? []).reduce((n, c) => n + c.count, 0);
}

/** The summary the generator wrote — "120 availability (option)" and so on. */
function describe(cs: ChangesetSummary): string {
  const entries = Object.entries(cs.summary ?? {}).filter(
    ([k, v]) => typeof v === "number" && k !== "dependsOn",
  );
  if (!entries.length) return "";
  return entries.map(([k, v]) => `${v as number} ${k}`).join(" · ");
}

export function SpecChangesetTable({
  changesets,
  all,
}: {
  /** The frames to list — the pending ones. */
  changesets: ChangesetSummary[];
  /** Every frame, including approved ones: readiness is judged against those. */
  all: ChangesetSummary[];
}) {
  return (
    <div className="overflow-x-auto rounded-md border border-border">
      <table className="w-full min-w-[40rem] text-sm">
        <thead className="bg-muted/40 text-left text-muted-foreground">
          <tr>
            <th className="px-3 py-2 font-medium">Frame</th>
            <th className="px-3 py-2 font-medium">Source</th>
            <th className="px-3 py-2 font-medium text-right">Items</th>
            <th className="px-3 py-2 font-medium">What it changes</th>
            <th className="px-3 py-2 font-medium">Ready?</th>
          </tr>
        </thead>
        <tbody>
          {byReadiness(changesets, all).map((cs) => {
            const blocked = blockedBy(cs, all);
            return (
            <tr key={cs.id} className="border-t border-border hover:bg-muted/30">
              <td className="px-3 py-2">
                <Link href={`/spec/${cs.id}`} className="font-medium text-foreground hover:underline">
                  {cs.frame}
                </Link>
              </td>
              <td className="px-3 py-2 text-muted-foreground">
                <Badge variant="secondary">{cs.source}</Badge>
              </td>
              <td className="px-3 py-2 text-right tabular-nums">{itemTotal(cs) || "—"}</td>
              <td className="px-3 py-2 text-muted-foreground">{describe(cs) || "—"}</td>
              <td className="px-3 py-2">
                {blocked.length === 0 ? (
                  <span className="text-foreground">Ready</span>
                ) : (
                  <span className="text-muted-foreground">
                    after {blocked.join(", ")}
                  </span>
                )}
              </td>
            </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
