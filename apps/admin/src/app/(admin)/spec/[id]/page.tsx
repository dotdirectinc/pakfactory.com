import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@pakfactory/ui/components/badge";
import { getChangesetDetail } from "@/lib/spec/registry-api";
import { canApprove, requireRegistryGrant } from "@/lib/spec/require-grant";
import { SpecDecisionBar } from "@/components/spec/spec-decision-bar";
import { ADMIN_SPEC_COPY } from "@/lib/copy/spec";

export const metadata = { title: "Review frame" };

/** Items grouped by what they touch — a reviewer asks "what changes", not "row 417". */
function groupItems(items: { entity_type: string; op: string }[]) {
  const counts = new Map<string, number>();
  for (const i of items) {
    const key = `${i.op} ${i.entity_type}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts].sort(([a], [b]) => a.localeCompare(b));
}

export default async function SpecChangesetPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const me = await requireRegistryGrant();
  const { id } = await params;
  const res = await getChangesetDetail(id);
  if (!res.ok) {
    if (res.status === 404) notFound();
    return (
      <p role="alert" className="text-sm text-destructive">
        {res.error}
      </p>
    );
  }

  const cs = res.data;
  const items = cs.items ?? [];

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-5">
      <div className="flex flex-col gap-2">
        <Link href="/spec" className="text-sm text-muted-foreground hover:underline">
          ← {ADMIN_SPEC_COPY.listTitle}
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-semibold tracking-tight text-foreground">{cs.frame}</h1>
          <Badge variant={cs.state === "draft" ? "secondary" : "outline"}>{cs.state}</Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          {cs.source} · {items.length.toLocaleString()} changes
        </p>
      </div>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium text-foreground">{ADMIN_SPEC_COPY.itemsHeading}</h2>
        <ul className="grid gap-1 text-sm text-muted-foreground sm:grid-cols-2">
          {groupItems(items).map(([label, n]) => (
            <li key={label} className="flex justify-between gap-4 rounded-md border border-border px-3 py-2">
              <span>{label.replace(/_/g, " ")}</span>
              <span className="tabular-nums text-foreground">{n.toLocaleString()}</span>
            </li>
          ))}
        </ul>
      </section>

      {cs.state === "draft" ? (
        <SpecDecisionBar
          changesetId={cs.id}
          itemCount={items.length}
          canDecide={canApprove(me)}
        />
      ) : (
        <p className="text-sm text-muted-foreground">{ADMIN_SPEC_COPY.decidedNote}</p>
      )}
    </div>
  );
}
