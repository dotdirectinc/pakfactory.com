import Link from "next/link";
import { Badge } from "@pakfactory/ui/components/badge";
import type { ChangesetSummary } from "@/lib/spec/registry-api";
import { blockedBy, byReadiness } from "@/lib/spec/prerequisites";
import { ADMIN_SPEC_REGISTRY_COPY as COPY } from "@/lib/copy/spec";

/** A source as a reviewer says it — "Sync (Sanity)", not "sanity-sync". */
export function sourceLabel(source: string): string {
  return COPY.sources[source] ?? source;
}

/**
 * One line on what a frame changes: a Spec System edit's first sentence, otherwise the summary the
 * generator wrote ("120 availability (option)" and so on).
 */
export function describeFrame(cs: ChangesetSummary): string {
  const impact = (cs.summary?.impact as { sentences?: unknown } | undefined)?.sentences;
  const sentences = Array.isArray(impact) ? impact : Array.isArray(cs.summary?.sentences) ? (cs.summary.sentences as unknown[]) : [];
  if (typeof sentences[0] === "string") return sentences.length > 1 ? `${sentences[0]} (+${sentences.length - 1} more)` : sentences[0];
  return Object.entries(cs.summary ?? {})
    // `items` repeats the Changes count shown beside it.
    .filter(([k, v]) => typeof v === "number" && k !== "dependsOn" && k !== "items")
    .map(([k, v]) => `${v as number} ${k}`)
    .join(" · ");
}

/**
 * The frames waiting for review. A frame is only reviewable as a whole, so this lists frames and not
 * items: the decision applies to every row in one, and a per-item view would imply otherwise.
 * Ready ones first; a frame that must wait for another says which.
 */
export function SpecChangesetTable({
  changesets,
  approved,
}: {
  /** The frames to list — the waiting ones. */
  changesets: ChangesetSummary[];
  /** Frames already approved — readiness is judged against these (only the listed frames' prerequisites are needed). */
  approved: Set<string>;
}) {
  return (
    <div className="overflow-x-auto rounded-md border border-border">
      <table className="w-full min-w-[40rem] text-sm">
        <thead className="bg-muted/40 text-left text-xs text-muted-foreground">
          <tr>
            <th className="px-3 py-2 font-medium">{COPY.frame}</th>
            <th className="px-3 py-2 font-medium">{COPY.source}</th>
            <th className="px-3 py-2 text-right font-medium">{COPY.changes}</th>
            <th className="px-3 py-2 font-medium">{COPY.status}</th>
            <th className="px-3 py-2" />
          </tr>
        </thead>
        <tbody>
          {byReadiness(changesets, approved).map((cs) => {
            const blocked = blockedBy(cs, approved);
            const what = describeFrame(cs);
            return (
              <tr key={cs.id} className="border-t border-border align-top hover:bg-muted/30">
                <td className="px-3 py-2">
                  <Link href={`/spec/${cs.id}`} className="font-medium text-foreground hover:underline">
                    {cs.frame}
                  </Link>
                  {what ? <p className="mt-0.5 max-w-xl text-xs text-muted-foreground">{what}</p> : null}
                </td>
                <td className="px-3 py-2">
                  <Badge variant="secondary">{sourceLabel(cs.source)}</Badge>
                </td>
                <td className="px-3 py-2 text-right tabular-nums">{cs.item_count?.toLocaleString() ?? "—"}</td>
                <td className="px-3 py-2">
                  {blocked.length === 0 ? (
                    <span className="text-foreground">{COPY.ready}</span>
                  ) : (
                    <span className="text-muted-foreground">{COPY.after(blocked.join(", "))}</span>
                  )}
                </td>
                <td className="px-3 py-2 text-right">
                  <Link href={`/spec/${cs.id}`} className="text-xs font-medium text-primary hover:underline">
                    {COPY.review} →
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
