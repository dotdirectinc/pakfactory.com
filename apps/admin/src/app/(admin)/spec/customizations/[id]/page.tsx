import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@pakfactory/ui/components/badge";
import { requireRegistryGrant } from "@/lib/spec/require-grant";
import { getCustomizationView } from "@/lib/spec/cached-views";
import { SpecRegistryId } from "@/components/spec/spec-registry-id";
import {
  ADMIN_SPEC_PRODUCTS_COPY as COPY,
  ADMIN_SPEC_RULES_COPY as RULES_COPY,
} from "@/lib/copy/spec";

export const metadata = { title: "Customization rules" };

/** One option (PROD-2614): its pairs, and the products that end up offering it. */
export default async function SpecCustomizationPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRegistryGrant();
  const { id } = await params;
  const res = await getCustomizationView(decodeURIComponent(id));
  if (!res.ok) {
    return (
      <p role="alert" className="rounded-md border border-border bg-muted/30 p-4 text-sm text-destructive">
        {RULES_COPY.unreachable} ({res.error})
      </p>
    );
  }
  const view = res.data;
  if (!view) notFound();

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4">
      <Link href="/spec/rules?tab=options" className="text-sm text-muted-foreground hover:underline">
        ← {RULES_COPY.title}
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold tracking-tight text-foreground">{view.title}</h1>
          <p className="text-sm text-muted-foreground">
            {view.typeTitle}
            {view.decidedBy ? ` · ${RULES_COPY.decidedBy[view.decidedBy]}` : ""}
          </p>
          <SpecRegistryId registry={view.registry} />
        </div>
        {view.studioUrl && (
          <a href={view.studioUrl} target="_blank" rel="noreferrer" className="rounded-md border border-border px-3 py-1.5 text-sm text-foreground hover:bg-muted">
            {COPY.editInStudio} ↗
          </a>
        )}
      </div>
      <p className="max-w-2xl text-sm text-muted-foreground">{COPY.customizationLead}</p>
      <div className="flex flex-wrap gap-2">
        <Badge variant="secondary">{RULES_COPY.optionStatus[view.status]}</Badge>
        <Badge variant="secondary">{COPY.productsOffering(view.offering.length)}</Badge>
        {view.addedByException > 0 && <Badge variant="secondary">{view.addedByException} by exception</Badge>}
        {view.removedByException > 0 && <Badge variant="secondary">removed on {view.removedByException}</Badge>}
      </div>

      <section className="rounded-md border border-border">
        <h2 className="border-b border-border bg-muted/40 px-3 py-2 text-sm font-semibold text-foreground">{COPY.pairsHeading}</h2>
        {view.partners.length === 0 ? (
          <p className="px-3 py-2 text-sm text-muted-foreground">{RULES_COPY.optionStatus["compatible-with-nothing"]}</p>
        ) : (
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 px-3 py-2 text-sm">
            {view.partners.map((p) => (
              <div key={p.typeId} className="contents">
                <dt className="text-muted-foreground">{RULES_COPY.relation[p.relation]} {p.typeTitle}</dt>
                <dd className="text-foreground">{p.text}</dd>
              </div>
            ))}
          </dl>
        )}
      </section>

      <section className="rounded-md border border-border">
        <h2 className="border-b border-border bg-muted/40 px-3 py-2 text-sm font-semibold text-foreground">
          {COPY.productsHeading} ({view.offering.length})
        </h2>
        <ul className="max-h-96 divide-y divide-border overflow-y-auto text-sm">
          {view.offering.map((p) => (
            <li key={p.id} className="px-3 py-1.5">
              <Link href={`/spec/products/${encodeURIComponent(p.id)}`} className="text-foreground hover:underline">
                {p.title}
              </Link>
              {p.lineTitle && <span className="ml-2 text-xs text-muted-foreground">{p.lineTitle}</span>}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
