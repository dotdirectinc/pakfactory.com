import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@pakfactory/ui/components/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@pakfactory/ui/components/card";
import { cn } from "@pakfactory/ui/lib/utils";
import { PageHeader } from "@/components/ui/page-header";
import { LibraryBundleApprove } from "@/components/spec/library/library-bundle-approve";
import { WARNING_BADGE } from "@/components/spec/library/spec-value";
import { canReviewLibrary, requireRegistryGrant } from "@/lib/spec/require-grant";
import { getLibraryProductTypeReview, type LibraryBundleItem, type LibraryReviewState } from "@/lib/spec/registry-api";
import { bundleSections, sortBundle, stateCounts, templateLevelLabel } from "@/lib/spec/library-bundle";
import { lineOf } from "@/lib/spec/library-review";
import { productTypesHref } from "@/lib/spec/library-usage";
import { ADMIN_SPEC_LIBRARY_COPY } from "@/lib/copy/spec-library";

export const metadata = { title: "Product type review" };

const COPY = ADMIN_SPEC_LIBRARY_COPY.productType;

/** Outline colour per decision: to review, approved, rejected, deferred. */
const STATE_TONE: Record<LibraryReviewState, string> = {
  pending: "border-border bg-background",
  approve: "border-emerald-600/50 bg-emerald-500/10 text-emerald-900 dark:text-emerald-200",
  reject: "border-destructive/50 bg-destructive/10 text-destructive",
  defer: WARNING_BADGE,
};

const recordHref = (i: LibraryBundleItem) => `/spec/library/${i.version}/${i.collection}/${encodeURIComponent(i.sourceId)}`;

function StateBadge({ state }: { state: LibraryReviewState }) {
  return (
    <Badge variant="outline" className={cn("font-normal", STATE_TONE[state])}>
      {ADMIN_SPEC_LIBRARY_COPY.states[state]}
    </Badge>
  );
}

/**
 * A product type reviewed with the records it is built from (PLAT-81): its template chain and the
 * capabilities of its line on one page, each linked to its own record page and coloured by its
 * decision. "Approve…" opens a dialog to approve a chosen subset; reject and defer stay on the
 * record pages, where each gets its own note.
 */
export default async function SpecLibraryProductTypePage({ params }: { params: Promise<{ sourceId: string }> }) {
  const { sourceId: raw } = await params;
  const sourceId = decodeURIComponent(raw);
  if (!/^PT-[A-Z0-9][A-Z0-9-]{0,80}$/.test(sourceId)) notFound();

  const [me, res] = await Promise.all([requireRegistryGrant(), getLibraryProductTypeReview(sourceId)]);
  if (!res.ok) {
    if (res.status === 404) notFound();
    return (
      <p role="alert" className="p-4 text-sm text-destructive">
        {ADMIN_SPEC_LIBRARY_COPY.unreachable} ({res.error})
      </p>
    );
  }
  const { productType: pt, items } = res.data;
  const self = items.find((i) => i.collection === "product_type");
  const templates = sortBundle(items.filter((i) => i.collection === "template"));
  const capSections = bundleSections(items.filter((i) => i.collection === "capability"));
  const capCount = capSections.reduce((n, s) => n + s.items.length, 0);
  const counts = stateCounts(items);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <PageHeader
        title={pt.name}
        lead={
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs">{pt.sourceId}</span>
            <span aria-hidden>·</span>
            <span>{pt.lineName}</span>
            <span aria-hidden>·</span>
            <span>{COPY.progress(counts.approve, items.length)}</span>
          </span>
        }
        back={{
          href: productTypesHref({ line: lineOf(pt.line) }),
          label: ADMIN_SPEC_LIBRARY_COPY.back,
        }}
        badge={self ? <StateBadge state={self.state} /> : undefined}
        aside={
          canReviewLibrary(me) ? (
            <LibraryBundleApprove name={pt.name} items={items} />
          ) : (
            <span className="text-sm text-muted-foreground">{ADMIN_SPEC_LIBRARY_COPY.readOnlyNote}</span>
          )
        }
      />

      <div className="flex flex-wrap items-center gap-2 text-sm">
        {(["pending", "approve", "defer", "reject"] as const).map((s) => (
          <span key={s} className={cn("rounded-md border px-2 py-0.5", STATE_TONE[s])}>
            {ADMIN_SPEC_LIBRARY_COPY.states[s]} {counts[s]}
          </span>
        ))}
        <span className="text-muted-foreground">{COPY.legend}</span>
      </div>

      {self ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{COPY.productTypeHeading}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-2 text-sm">
            <Link href={recordHref(self)} className="font-medium underline-offset-4 hover:underline">
              {self.label ?? self.sourceId}
            </Link>
            <span className="font-mono text-xs text-muted-foreground">{self.sourceId}</span>
            <span className="text-xs text-muted-foreground">v{self.version}</span>
            <StateBadge state={self.state} />
            {self.note ? <span className="text-muted-foreground">“{self.note}”</span> : null}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{COPY.templateHeading}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 text-sm">
          <p className="text-muted-foreground">{COPY.templateLead}</p>
          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full">
              <thead className="bg-muted/40 text-left text-xs text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">{COPY.templateColumns.level}</th>
                  <th className="px-3 py-2 font-medium">{COPY.templateColumns.template}</th>
                  <th className="px-3 py-2 text-right font-medium">{COPY.templateColumns.entries}</th>
                  <th className="px-3 py-2 font-medium">{COPY.templateColumns.version}</th>
                  <th className="px-3 py-2 font-medium">{COPY.templateColumns.state}</th>
                  <th className="px-3 py-2 font-medium">{COPY.templateColumns.shared}</th>
                </tr>
              </thead>
              <tbody>
                {templates.map((t) => (
                  <tr key={t.sourceId} className={cn("border-t border-border", t.level === "type" && "bg-muted/20")}>
                    <td className="px-3 py-2">{templateLevelLabel(t.level)}</td>
                    <td className="px-3 py-2">
                      <Link href={recordHref(t)} className="underline-offset-4 hover:underline">
                        {t.label ?? t.sourceId}
                      </Link>{" "}
                      <span className="font-mono text-xs text-muted-foreground">{t.sourceId}</span>
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{t.entries ?? "—"}</td>
                    <td className="px-3 py-2">v{t.version}</td>
                    <td className="px-3 py-2">
                      <StateBadge state={t.state} />
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">{COPY.sharedBy(t.sharedBy)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-baseline justify-between gap-2">
          <CardTitle className="text-base">{COPY.capabilitiesHeading}</CardTitle>
          <span className="text-sm text-muted-foreground">{COPY.capabilitiesCount(capCount, pt.lineName)}</span>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          {capSections.map((s) => (
            <section key={s.key} className="flex flex-col gap-2">
              <h3 className="text-sm font-medium">
                {s.title} <span className="font-normal text-muted-foreground">{s.items.length}</span>
              </h3>
              <ul className="flex flex-wrap gap-2">
                {s.items.map((c) => (
                  <li key={c.sourceId}>
                    <Link
                      href={recordHref(c)}
                      title={`${c.sourceId} · ${ADMIN_SPEC_LIBRARY_COPY.states[c.state]} · v${c.version} · ${COPY.sharedBy(c.sharedBy)}`}
                      className={cn(
                        "inline-flex items-center rounded-full border px-3 py-1 text-sm transition-colors hover:bg-muted",
                        STATE_TONE[c.state],
                      )}
                    >
                      {c.label ?? c.sourceId}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
