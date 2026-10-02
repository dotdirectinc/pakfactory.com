import Link from "next/link";
import { Badge } from "@pakfactory/ui/components/badge";
import { requireRegistryGrant } from "@/lib/spec/require-grant";
import { getProductRows } from "@/lib/spec/cached-views";
import { getInspirationList } from "@/lib/spec/solution-browse";
import { SpecProductTable } from "@/components/spec/spec-product-table";
import { SpecInspirationTable } from "@/components/spec/spec-inspiration-table";
import {
  ADMIN_SPEC_PRODUCTS_COPY as COPY,
  ADMIN_SPEC_RULES_COPY,
  ADMIN_SPEC_SOLUTIONS_COPY,
} from "@/lib/copy/spec";

export const metadata = { title: "Products" };

type Kind = "standard" | "inspiration";

export default async function SpecProductsPage({ searchParams }: { searchParams: Promise<{ kind?: string }> }) {
  await requireRegistryGrant();
  const kind: Kind = (await searchParams).kind === "inspiration" ? "inspiration" : "standard";
  // Standard products come with what the rules make of them; inspiration products are listed with
  // their base product and primary solution (PROD-2782). Only the chosen list is read.
  const standard = kind === "standard" ? await getProductRows() : null;
  const inspiration = kind === "inspiration" ? await getInspirationList() : null;
  const res = standard ?? inspiration!;

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-4">
      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-semibold tracking-tight text-foreground">{COPY.listTitle}</h1>
          {res.ok && <Badge variant="secondary">{ADMIN_SPEC_RULES_COPY.datasetNote(res.data.dataset)}</Badge>}
        </div>
        <p className="max-w-2xl text-sm text-muted-foreground">
          {kind === "inspiration" ? ADMIN_SPEC_SOLUTIONS_COPY.inspirationLead : COPY.listLead}
        </p>
      </div>
      <KindSwitch current={kind} />
      {!res.ok ? (
        <p role="alert" className="rounded-md border border-border bg-muted/30 p-4 text-sm text-destructive">
          {ADMIN_SPEC_RULES_COPY.unreachable} ({res.error})
        </p>
      ) : standard?.ok ? (
        <SpecProductTable rows={standard.data.rows} />
      ) : inspiration?.ok ? (
        <SpecInspirationTable rows={inspiration.data.rows} />
      ) : null}
    </div>
  );
}

function KindSwitch({ current }: { current: Kind }) {
  const tabs: { kind: Kind; href: string }[] = [
    { kind: "standard", href: "/spec/products" },
    { kind: "inspiration", href: "/spec/products?kind=inspiration" },
  ];
  return (
    <nav aria-label="Product type" className="flex gap-1 border-b border-border">
      {tabs.map((t) => (
        <Link
          key={t.kind}
          href={t.href}
          aria-current={t.kind === current ? "page" : undefined}
          className={
            t.kind === current
              ? "-mb-px border-b-2 border-foreground px-3 py-1.5 text-sm font-medium text-foreground"
              : "px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground"
          }
        >
          {ADMIN_SPEC_SOLUTIONS_COPY.kindTabs[t.kind]}
        </Link>
      ))}
    </nav>
  );
}
