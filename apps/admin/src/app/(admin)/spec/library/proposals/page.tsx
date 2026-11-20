import Link from "next/link";
import { Badge } from "@pakfactory/ui/components/badge";
import { LocalTime } from "@pakfactory/ui/components/local-time";
import { PageHeader } from "@/components/ui/page-header";
import { ReviewTabs } from "@/components/spec/spec-section-tabs";
import { RowDecision } from "@/components/spec/library/library-change-list";
import { ChangeTable } from "@/components/spec/library/library-type-editor";
import { canAdminSpec, requireRegistryGrant } from "@/lib/spec/require-grant";
import { listSpecEdits, type SpecEdit } from "@/lib/spec/registry-api";
import { recordChanges } from "@/lib/spec/type-editor";
import { ADMIN_SPEC_LIBRARY_COPY } from "@/lib/copy/spec-library";

export const metadata = { title: "Proposals" };

const COPY = ADMIN_SPEC_LIBRARY_COPY.proposals;
const EDITOR = ADMIN_SPEC_LIBRARY_COPY.editor;

/** The product type a proposal belongs to, when its record names one (a type, or a type's own template). */
function productTypeOf(e: SpecEdit): string | null {
  if (!e.sourceId) return null;
  if (e.collection === "productTypes") return e.sourceId;
  if (e.collection === "templates" && /^TPL-[A-Z0-9]+-[A-Z0-9-]+$/.test(e.sourceId)) return e.sourceId.replace(/^TPL-/, "PT-");
  return null;
}

/**
 * Proposals waiting for an admin (PLAT-85, ADR-028 D4): saves by people who are not admins, and later
 * records added from a map and vendor submissions. Each shows what it would change; an admin decides
 * it here. Everyone else sees the list read-only.
 */
export default async function SpecProposalsPage() {
  const [me, res] = await Promise.all([requireRegistryGrant(), listSpecEdits({ state: "waiting", limit: 500 })]);
  const admin = canAdminSpec(me);
  const items = res.ok ? res.data.items.filter((e) => e.subject === "record") : [];

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
      <ReviewTabs active="proposals" />
      <PageHeader title={COPY.title} lead={`${COPY.lead} ${admin ? COPY.leadAdmin : COPY.leadOther}`} />
      {!res.ok ? (
        <p role="alert" className="text-sm text-destructive">{ADMIN_SPEC_LIBRARY_COPY.unreachable} ({res.error})</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{COPY.none}</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {items.map((e) => {
            const pt = productTypeOf(e);
            const changes =
              e.action === "update" || e.action === "create" ? recordChanges(e.current ?? null, e.proposed ?? {}) : [];
            return (
              <li key={e.id} className="flex flex-col gap-3 rounded-md border border-border p-4 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="font-normal">{EDITOR.actions[e.action] ?? e.action}</Badge>
                  <span className="font-medium">{String(e.proposed?.name ?? e.current?.name ?? e.sourceId)}</span>
                  <span className="font-mono text-xs text-muted-foreground">{e.sourceId} · #{e.id}</span>
                  {pt ? (
                    <Link className="ml-auto text-xs underline underline-offset-2" href={`/spec/library/product-types/${encodeURIComponent(pt)}`}>
                      {COPY.openType}
                    </Link>
                  ) : null}
                </div>
                <p className="text-xs text-muted-foreground">
                  {e.createdByName ?? "—"} · <LocalTime iso={e.createdAt} />
                </p>
                {e.note ? <p className="italic">“{e.note}”</p> : null}
                {changes.length ? <ChangeTable changes={changes} /> : (
                  <p>{e.action === "retire" ? COPY.retire : e.action === "restore" ? COPY.restore : EDITOR.noChange}</p>
                )}
                {admin ? <RowDecision route={{ kind: "edit", edit: e.id }} /> : (
                  <p className="text-xs text-muted-foreground">{COPY.waitingAdmin}</p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
