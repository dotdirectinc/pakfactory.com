import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@pakfactory/ui/components/badge";
import { Button } from "@pakfactory/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@pakfactory/ui/components/card";
import { LocalTime } from "@pakfactory/ui/components/local-time";
import { cn } from "@pakfactory/ui/lib/utils";
import { PageHeader } from "@/components/ui/page-header";
import { LibraryDecisionForm } from "@/components/spec/library/library-decision-form";
import { RuleLogic } from "@/components/spec/library/rule-logic";
import { FactBadge, SpecValue, WARNING_BADGE } from "@/components/spec/library/spec-value";
import { canReviewLibrary, requireRegistryGrant } from "@/lib/spec/require-grant";
import { getLibraryRecord } from "@/lib/spec/registry-api";
import { collectionLabel, isCollection, listHref } from "@/lib/spec/library-review";
import { FACT_KEYS, isEmpty, labelOf, splitFields, titleOf } from "@/lib/spec/library-display";
import { ADMIN_SPEC_LIBRARY_COPY as COPY } from "@/lib/copy/spec-library";

export const metadata = { title: "Library record" };

/**
 * One Spec Library record, laid out for a reviewer (PFP-124 / PLAT-81). What it is (title, code,
 * badges, its description or message), then a rule's logic in words, then its details with readable
 * labels and linked records by name, then the rows reviewed with it. Empty fields and bookkeeping are
 * folded away. Deciding and the decision history sit beside it.
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

  const [me, res] = await Promise.all([requireRegistryGrant(), getLibraryRecord(version, collection, sourceId)]);
  if (!res.ok) {
    if (res.status === 404) notFound();
    return <p role="alert" className="p-4 text-sm text-destructive">{COPY.unreachable} ({res.error})</p>;
  }
  const { record, children, history, refs } = res.data;
  const latest = history[0];
  const isRule = collection === "rule";
  const facts = FACT_KEYS.filter((k) => !isEmpty(record[k]));
  const { lead, content, empty, system } = splitFields(record, [...facts, ...(isRule ? ["body"] : [])]);
  const childEntries = Object.entries(children).filter(([, rows]) => !isEmpty(rows));
  const emptyChildren = Object.entries(children).filter(([, rows]) => isEmpty(rows)).map(([k]) => k);
  const severity = String(record.severity ?? "");

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <PageHeader
        title={titleOf(record, sourceId)}
        lead={
          <span className="flex flex-wrap items-center gap-2">
            <span>{collectionLabel(collection)}</span>
            <span aria-hidden>·</span>
            <span className="font-mono text-xs">{sourceId}</span>
            <span aria-hidden>·</span>
            <span>{COPY.version(version)}</span>
          </span>
        }
        back={{ href: listHref({ version, collection, state: "all", search: sourceId }), label: COPY.back }}
        badge={<Badge variant={latest?.decision === "reject" ? "destructive" : latest?.decision === "approve" ? "default" : "outline"}>{COPY.states[latest?.decision ?? "pending"]}</Badge>}
        aside={
          collection === "product_type" ? (
            <Button asChild variant="outline">
              <Link href={`/spec/library/product-types/${encodeURIComponent(sourceId)}`}>{COPY.productType.reviewTogether}</Link>
            </Button>
          ) : undefined
        }
      />

      {facts.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {facts.map((k) => (
            <FactBadge key={k} field={k} value={record[k]} />
          ))}
        </div>
      ) : null}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="flex min-w-0 flex-col gap-6">
          {lead.map(([k, text]) =>
            k === "message" ? (
              <blockquote
                key={k}
                className={cn(
                  "rounded-md border px-4 py-3 text-base",
                  severity === "warning" ? WARNING_BADGE : severity === "error" || severity === "block" ? "border-destructive/40 bg-destructive/5" : "border-border bg-muted/30",
                )}
              >
                <p className="mb-1 text-xs font-medium uppercase tracking-wide opacity-70">{COPY.record.messageLabel}</p>
                {text}
              </blockquote>
            ) : (
              <p key={k} className="max-w-3xl text-base leading-relaxed">
                {text}
              </p>
            ),
          )}

          {isRule && !isEmpty(record.body) ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{COPY.record.logic}</CardTitle>
              </CardHeader>
              <CardContent>
                <RuleLogic body={record.body} refs={refs} />
              </CardContent>
            </Card>
          ) : null}

          {content.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{COPY.record.details}</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="grid gap-x-6 gap-y-4 text-sm sm:grid-cols-[12rem_minmax(0,1fr)]">
                  {content.map(([k, val]) => (
                    <div key={k} className="contents">
                      <dt className="text-muted-foreground">{labelOf(k)}</dt>
                      <dd className="min-w-0">
                        <SpecValue value={val} refs={refs} />
                      </dd>
                    </div>
                  ))}
                </dl>
              </CardContent>
            </Card>
          ) : null}

          {childEntries.map(([name, rows]) => (
            <Card key={name}>
              <CardHeader>
                <CardTitle className="flex items-baseline gap-2 text-base">
                  {labelOf(name)}
                  <span className="text-sm font-normal text-muted-foreground">{Array.isArray(rows) ? rows.length : ""}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm">
                <SpecValue value={rows} refs={refs} />
              </CardContent>
            </Card>
          ))}

          {empty.length + emptyChildren.length > 0 ? (
            <details open className="rounded-md border border-border px-4 py-3 text-sm">
              <summary className="cursor-pointer text-muted-foreground">{COPY.record.emptyFields(empty.length + emptyChildren.length)}</summary>
              <p className="mt-2 text-muted-foreground">{[...empty, ...emptyChildren].map(labelOf).join(" · ")}</p>
            </details>
          ) : null}

          {system.length > 0 ? (
            <details open className="rounded-md border border-border px-4 py-3 text-sm">
              <summary className="cursor-pointer text-muted-foreground">{COPY.record.system}</summary>
              <dl className="mt-3 grid gap-x-6 gap-y-2 sm:grid-cols-[12rem_minmax(0,1fr)]">
                {system.map(([k, val]) => (
                  <div key={k} className="contents">
                    <dt className="font-mono text-xs text-muted-foreground">{k}</dt>
                    <dd className="min-w-0 text-xs">
                      <SpecValue value={val} refs={refs} />
                    </dd>
                  </div>
                ))}
              </dl>
            </details>
          ) : null}
        </div>

        <aside className="flex flex-col gap-6 lg:sticky lg:top-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{COPY.decideHeading}</CardTitle>
            </CardHeader>
            <CardContent>
              {canReviewLibrary(me) ? (
                <LibraryDecisionForm version={version} items={[{ collection, sourceId }]} />
              ) : (
                <p className="text-sm text-muted-foreground">{COPY.readOnlyNote}</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{COPY.historyHeading}</CardTitle>
            </CardHeader>
            <CardContent>
              {history.length === 0 ? (
                <p className="text-sm text-muted-foreground">{COPY.noHistory}</p>
              ) : (
                <ol className="flex flex-col gap-4 border-l border-border pl-4 text-sm">
                  {history.map((h, i) => (
                    <li key={i} className="flex flex-col gap-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <Badge variant={h.decision === "reject" ? "destructive" : h.decision === "approve" ? "default" : "secondary"}>
                          {COPY.states[h.decision]}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          <LocalTime iso={h.decidedAt} preset="dateTime" />
                        </span>
                      </span>
                      <span className="text-muted-foreground">{h.decidedByName ?? h.decidedBy}</span>
                      {h.note ? <span>{h.note}</span> : null}
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
