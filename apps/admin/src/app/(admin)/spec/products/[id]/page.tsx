import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRegistryGrant } from "@/lib/spec/require-grant";
import { getProductView } from "@/lib/spec/cached-views";
import { SpecProductDetail } from "@/components/spec/spec-product-detail";
import { SpecRegistryId } from "@/components/spec/spec-registry-id";
import { ADMIN_SPEC_PRODUCTS_COPY as COPY, ADMIN_SPEC_RULES_COPY } from "@/lib/copy/spec";

export const metadata = { title: "Product rules" };

export default async function SpecProductPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRegistryGrant();
  const { id } = await params;
  const res = await getProductView(decodeURIComponent(id));
  if (!res.ok) {
    return (
      <p role="alert" className="rounded-md border border-border bg-muted/30 p-4 text-sm text-destructive">
        {ADMIN_SPEC_RULES_COPY.unreachable} ({res.error})
      </p>
    );
  }
  const view = res.data;
  if (!view) notFound();

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-4">
      <Link href="/spec/catalog?group=products&level=product" className="text-sm text-muted-foreground hover:underline">
        ← {COPY.backToList}
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold tracking-tight text-foreground">{view.title}</h1>
          <p className="text-sm text-muted-foreground">
            {[view.lineTitle, ...view.styleTitles].filter(Boolean).join(" · ") || "—"}
          </p>
          <SpecRegistryId registry={view.registry} />
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
