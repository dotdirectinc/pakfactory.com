import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRegistryGrant } from "@/lib/spec/require-grant";
import { loadRulesSource } from "@/lib/spec/rules-source";
import { buildProductView, findProduct } from "@/lib/spec/product-view";
import { SpecProductDetail } from "@/components/spec/spec-product-detail";
import { ADMIN_SPEC_PRODUCTS_COPY as COPY, ADMIN_SPEC_RULES_COPY } from "@/lib/copy/spec";

export const metadata = { title: "Product rules" };

export default async function SpecProductPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRegistryGrant();
  const { id } = await params;
  const res = await loadRulesSource();
  if (!res.ok) {
    return (
      <p role="alert" className="rounded-md border border-border bg-muted/30 p-4 text-sm text-destructive">
        {ADMIN_SPEC_RULES_COPY.unreachable} ({res.error})
      </p>
    );
  }
  const product = findProduct(res.data, decodeURIComponent(id));
  if (!product) notFound();
  const view = buildProductView(res.data, product);

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-4">
      <Link href="/spec/products" className="text-sm text-muted-foreground hover:underline">
        ← {COPY.backToList}
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold tracking-tight text-foreground">{view.title}</h1>
          <p className="text-sm text-muted-foreground">
            {[view.lineTitle, ...view.styleTitles].filter(Boolean).join(" · ") || "—"}
          </p>
        </div>
        {view.studioUrl && (
          <a
            href={view.studioUrl}
            target="_blank"
            rel="noreferrer"
            className="rounded-md border border-border px-3 py-1.5 text-sm text-foreground hover:bg-muted"
          >
            {COPY.editInStudio} ↗
          </a>
        )}
      </div>
      <SpecProductDetail view={view} />
    </div>
  );
}
