import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@pakfactory/ui/components/badge";
import { resolveForProduct } from "@pakfactory/sanity/customization-rules/resolve";
import { requireRegistryGrant } from "@/lib/spec/require-grant";
import { loadRulesSummary } from "@/lib/spec/rules-source";
import { studioEditUrl } from "@/lib/spec/studio-link";
import {
  ADMIN_SPEC_PRODUCTS_COPY as COPY,
  ADMIN_SPEC_RULES_COPY as RULES_COPY,
} from "@/lib/copy/spec";

export const metadata = { title: "Customization rules" };

/**
 * One option (PROD-2614): its pairs as the summary reads them, and the products that end up
 * offering it — each answer `resolveForProduct`'s, the storefront's own call.
 */
export default async function SpecCustomizationPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRegistryGrant();
  const { id: raw } = await params;
  const id = decodeURIComponent(raw);
  const res = await loadRulesSummary();
  if (!res.ok) {
    return (
      <p role="alert" className="rounded-md border border-border bg-muted/30 p-4 text-sm text-destructive">
        {RULES_COPY.unreachable} ({res.error})
      </p>
    );
  }
  const { source, summary } = res.data;
  const option = summary.options.find((o) => o.optionId === id);
  if (!option) notFound();
  const name = source.name;
  const type = summary.types.find((t) => t.typeId === option.typeId);

  const offering = source.products.filter((p) =>
    (resolveForProduct(source.catalog, p, source.graph, source.index).availableByType.get(option.typeId) ?? []).includes(id),
  );
  const studioUrl = studioEditUrl("customizationOption", id);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4">
      <Link href="/spec/rules" className="text-sm text-muted-foreground hover:underline">
        ← {RULES_COPY.title}
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold tracking-tight text-foreground">{name(id)}</h1>
          <p className="text-sm text-muted-foreground">
            {name(option.typeId)}
            {type ? ` · ${RULES_COPY.decidedBy[type.decidedBy]}` : ""}
          </p>
        </div>
        {studioUrl && (
          <a href={studioUrl} target="_blank" rel="noreferrer" className="rounded-md border border-border px-3 py-1.5 text-sm text-foreground hover:bg-muted">
            {COPY.editInStudio} ↗
          </a>
        )}
      </div>
      <p className="max-w-2xl text-sm text-muted-foreground">{COPY.customizationLead}</p>
      <div className="flex flex-wrap gap-2">
        <Badge variant="secondary">{RULES_COPY.optionStatus[option.status]}</Badge>
        <Badge variant="secondary">{COPY.productsOffering(offering.length)}</Badge>
        {option.addedByException > 0 && <Badge variant="secondary">{option.addedByException} by exception</Badge>}
        {option.removedByException > 0 && <Badge variant="secondary">removed on {option.removedByException}</Badge>}
      </div>

      <section className="rounded-md border border-border">
        <h2 className="border-b border-border bg-muted/40 px-3 py-2 text-sm font-semibold text-foreground">{COPY.pairsHeading}</h2>
        {option.partners.length === 0 ? (
          <p className="px-3 py-2 text-sm text-muted-foreground">{RULES_COPY.optionStatus["compatible-with-nothing"]}</p>
        ) : (
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 px-3 py-2 text-sm">
            {option.partners.map((p) => (
              <div key={p.typeId} className="contents">
                <dt className="text-muted-foreground">{RULES_COPY.relation[p.relation]} {name(p.typeId)}</dt>
                <dd className="text-foreground">
                  {p.coverage === "all"
                    ? `all ${p.typeSize}`
                    : p.coverage === "all-but"
                      ? `all except ${(p.missing ?? []).map(name).join(", ")}`
                      : p.partnerIds.map(name).join(", ")}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </section>

      <section className="rounded-md border border-border">
        <h2 className="border-b border-border bg-muted/40 px-3 py-2 text-sm font-semibold text-foreground">
          {COPY.productsHeading} ({offering.length})
        </h2>
        <ul className="max-h-96 divide-y divide-border overflow-y-auto text-sm">
          {offering.map((p) => (
            <li key={p._id} className="px-3 py-1.5">
              <Link href={`/spec/products/${encodeURIComponent(p._id)}`} className="text-foreground hover:underline">
                {p.title ?? p._id}
              </Link>
              <span className="ml-2 text-xs text-muted-foreground">{p.lineTitle}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
