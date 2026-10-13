import { getFrameOverrides } from "@/lib/spec/registry-api";
import { plain } from "@/components/spec/spec-item-list";
import { ADMIN_SPEC_OVERRIDE_COPY as COPY } from "@/lib/copy/spec";

/**
 * Before approving a Spec System edit: the Studio changes it would override (ADR-025 § 4, amended
 * 2026-10-13), read against Sanity now. Nothing when there are none.
 */
export async function SpecFrameOverrides({ changesetId }: { changesetId: string }) {
  const res = await getFrameOverrides(changesetId);
  if (!res.ok) return <p className="text-sm text-muted-foreground">{COPY.unreachable} ({res.error})</p>;
  if (!res.data.length) return null;
  return (
    <section role="alert" className="flex flex-col gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-4 text-sm">
      <h2 className="font-medium text-amber-900 dark:text-amber-200">{COPY.title(res.data.length)}</h2>
      <p className="text-amber-900/80 dark:text-amber-200/80">{COPY.lead}</p>
      <ul className="flex flex-col gap-2">
        {res.data.map((o) => (
          <li key={`${o.item_id}-${o.document}-${o.field}`} className="flex flex-col gap-0.5">
            <span className="font-medium text-foreground">{COPY.row(o.title, o.field)}{o.document.startsWith("drafts.") ? " (draft)" : ""}</span>
            <span className="text-xs text-muted-foreground">{COPY.proposedOver}: {plain(o.proposed_over, true, o.labels) || "—"}</span>
            <span className="text-xs text-foreground">{COPY.now}: {plain(o.was, true, o.labels) || "—"}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
