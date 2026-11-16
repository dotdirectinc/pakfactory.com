import { notFound } from "next/navigation";
import { Badge } from "@pakfactory/ui/components/badge";
import { LocalTime } from "@pakfactory/ui/components/local-time";
import { PageHeader } from "@/components/ui/page-header";
import { LibraryDecisionForm } from "@/components/spec/library/library-decision-form";
import { canReviewLibrary, requireRegistryGrant } from "@/lib/spec/require-grant";
import { getLibraryRecord, listLibraryVersions } from "@/lib/spec/registry-api";
import { collectionLabel, displayValue, isCollection, listHref } from "@/lib/spec/library-review";
import { ADMIN_SPEC_LIBRARY_COPY as COPY } from "@/lib/copy/spec-library";

export const metadata = { title: "Library record" };

/** Fields shown first, in this order; everything else follows alphabetically. */
const LEAD_FIELDS = ["source_id", "code", "name", "label", "local_name", "type", "severity", "message", "description", "status", "verification"];

/**
 * One Spec Library record (PFP-124): every stored field, the child rows reviewed with it (options,
 * parameters, template fields, grades, stock), its decision history, and the decision buttons.
 */
export default async function SpecLibraryRecordPage({
  params,
}: {
  params: Promise<{ version: string; collection: string; sourceId: string }>;
}) {
  const { version: v, collection, sourceId: rawId } = await params;
  const version = Number(v);
  if (!Number.isInteger(version) || version < 1 || !isCollection(collection)) notFound();
  const sourceId = decodeURIComponent(rawId);

  const [me, res, versionsRes] = await Promise.all([
    requireRegistryGrant(),
    getLibraryRecord(version, collection, sourceId),
    listLibraryVersions(),
  ]);
  if (!res.ok) {
    if (res.status === 404) notFound();
    return <p role="alert" className="p-4 text-sm text-destructive">{COPY.unreachable} ({res.error})</p>;
  }
  const { record, children, history } = res.data;
  const approved = versionsRes.ok ? Boolean(versionsRes.data.find((x) => x.number === version)?.approvedAt) : false;
  const latest = history[0];
  const keys = [
    ...LEAD_FIELDS.filter((k) => k in record),
    ...Object.keys(record).filter((k) => !LEAD_FIELDS.includes(k)).sort(),
  ];
  const childEntries = Object.entries(children).filter(([, rows]) => Array.isArray(rows) && rows.length > 0);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <PageHeader
        title={`${(record.name as string | undefined) ?? (record.label as string | undefined) ?? sourceId}`}
        lead={`${collectionLabel(collection)} · ${sourceId} · ${COPY.version(version)}`}
        back={{ href: listHref({ version, collection, state: "all", search: sourceId }), label: COPY.back }}
        badge={<Badge variant="outline">{COPY.states[latest?.decision ?? "pending"]}</Badge>}
      />

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold">{COPY.decideHeading}</h2>
        {approved ? (
          <p className="text-sm text-muted-foreground">{COPY.versionApproved}</p>
        ) : canReviewLibrary(me) ? (
          <LibraryDecisionForm version={version} items={[{ collection, sourceId }]} />
        ) : (
          <p className="text-sm text-muted-foreground">{COPY.readOnlyNote}</p>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold">{COPY.historyHeading}</h2>
        {history.length === 0 ? (
          <p className="text-sm text-muted-foreground">{COPY.noHistory}</p>
        ) : (
          <ul className="flex flex-col gap-1 text-sm">
            {history.map((h, i) => (
              <li key={i} className="flex flex-wrap gap-2">
                <Badge variant={h.decision === "reject" ? "destructive" : h.decision === "approve" ? "default" : "secondary"}>
                  {COPY.states[h.decision]}
                </Badge>
                <span className="text-muted-foreground">
                  {h.decidedByName ?? h.decidedBy} · <LocalTime iso={h.decidedAt} preset="dateTime" />
                </span>
                {h.note ? <span>— {h.note}</span> : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold">{COPY.recordHeading}</h2>
        <dl className="grid grid-cols-[12rem_1fr] gap-x-4 gap-y-1 rounded-md border border-border p-3 text-sm">
          {keys.map((k) => (
            <div key={k} className="contents">
              <dt className="font-mono text-xs text-muted-foreground">{k}</dt>
              <dd className="min-w-0 whitespace-pre-wrap break-words">{displayValue(record[k])}</dd>
            </div>
          ))}
        </dl>
      </section>

      {childEntries.length > 0 ? (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold">{COPY.childrenHeading}</h2>
          {childEntries.map(([name, rows]) => (
            <div key={name} className="flex flex-col gap-1">
              <h3 className="text-xs font-medium text-muted-foreground">
                {name} ({rows.length})
              </h3>
              <pre className="max-h-96 overflow-auto rounded-md border border-border bg-muted/30 p-3 text-xs">
                {rows.map((r) => (typeof r === "string" ? r : JSON.stringify(r))).join("\n")}
              </pre>
            </div>
          ))}
        </section>
      ) : null}
    </div>
  );
}
