import Link from "next/link";
import { Badge } from "@pakfactory/ui/components/badge";
import type { ChangesetSummary } from "@/lib/spec/registry-api";
import { ADMIN_SPEC_COPY as COPY } from "@/lib/copy/spec";

/**
 * The way back to a rule edit once its "Open the frame" message is gone (feedback 2026-10-14): the
 * latest Spec System edit frames, whatever their state, each with its first change as a sentence.
 */
export function SpecEditHistory({ changesets, limit = 15 }: { changesets: ChangesetSummary[]; limit?: number }) {
  const edits = changesets
    .filter((c) => c.source === "spec-edit")
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, limit);
  if (!edits.length) return null;
  return (
    <section className="flex flex-col gap-2">
      <div className="flex flex-col gap-0.5">
        <h2 className="text-sm font-medium text-foreground">{COPY.editsTitle}</h2>
        <p className="text-xs text-muted-foreground">{COPY.editsLead}</p>
      </div>
      <ul className="divide-y divide-border rounded-md border border-border">
        {edits.map((c) => {
          const sentences = Array.isArray(c.summary?.sentences) ? (c.summary.sentences as string[]) : [];
          return (
            <li key={c.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-3 py-2 text-sm">
              <Badge variant={c.state === "draft" ? "secondary" : "outline"}>{COPY.editsState[c.state] ?? c.state}</Badge>
              <span className="min-w-0 flex-1">
                <span className="text-foreground">{sentences[0] ?? c.frame}</span>
                {sentences.length > 1 ? <span className="text-muted-foreground"> {COPY.editsMore(sentences.length - 1)}</span> : null}
                <span className="block text-xs text-muted-foreground">{c.frame}</span>
              </span>
              <Link href={`/spec/${c.id}`} className="text-xs font-medium text-primary hover:underline">{COPY.editsOpen}</Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
