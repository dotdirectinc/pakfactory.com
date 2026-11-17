import Link from "next/link";
import { Badge } from "@pakfactory/ui/components/badge";
import { cn } from "@pakfactory/ui/lib/utils";
import { productTypeReviewHref, type ProductTypeProgress } from "@/lib/spec/library-usage";
import type { LibraryItem } from "@/lib/spec/registry-api";
import { ADMIN_SPEC_LIBRARY_COPY } from "@/lib/copy/spec-library";

const COPY = ADMIN_SPEC_LIBRARY_COPY.productTypeList;

export type ProductTypeRow = { item: LibraryItem; line?: string; progress: ProductTypeProgress | null };

/**
 * "By product type" (PLAT-81): one row per product type with its own decision and how many of the
 * records it is built from are approved. A row opens the product type's review page.
 */
export function LibraryProductTypeList({ rows, showLine }: { rows: ProductTypeRow[]; showLine: boolean }) {
  if (rows.length === 0) {
    return <p className="rounded-md border border-border p-4 text-sm text-muted-foreground">{COPY.empty}</p>;
  }
  return (
    <div className="overflow-x-auto rounded-md border border-border">
      <table className="w-full text-sm">
        <thead className="bg-muted/40 text-left text-xs text-muted-foreground">
          <tr>
            <th className="px-3 py-2 font-medium">{COPY.columns.productType}</th>
            {showLine ? <th className="px-3 py-2 font-medium">{COPY.columns.line}</th> : null}
            <th className="px-3 py-2 font-medium">{COPY.columns.own}</th>
            <th className="px-3 py-2 font-medium">{COPY.columns.progress}</th>
            <th className="px-3 py-2 text-right font-medium">{COPY.columns.open}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ item, line, progress }) => {
            const pct = progress && progress.total > 0 ? Math.round((progress.approve / progress.total) * 100) : 0;
            return (
              <tr key={item.sourceId} className="border-t border-border">
                <td className="px-3 py-2">
                  <Link href={productTypeReviewHref(item.sourceId)} className="font-medium underline-offset-4 hover:underline">
                    {item.label ?? item.sourceId}
                  </Link>{" "}
                  <span className="font-mono text-xs text-muted-foreground">{item.sourceId}</span>
                </td>
                {showLine ? <td className="px-3 py-2 text-muted-foreground">{line}</td> : null}
                <td className="px-3 py-2">
                  <Badge variant={item.state === "reject" ? "destructive" : item.state === "approve" ? "default" : "outline"} className="font-normal">
                    {ADMIN_SPEC_LIBRARY_COPY.states[item.state]}
                  </Badge>
                </td>
                <td className="px-3 py-2">
                  {progress ? (
                    <span className="flex items-center gap-2">
                      <span className="h-1.5 w-24 overflow-hidden rounded-full bg-muted" aria-hidden>
                        <span className="block h-full bg-primary" style={{ width: `${pct}%` }} />
                      </span>
                      <span className="tabular-nums">{COPY.progress(progress.approve, progress.total)}</span>
                    </span>
                  ) : (
                    COPY.unreadable
                  )}
                </td>
                <td className={cn("px-3 py-2 text-right tabular-nums", progress && progress.open > 0 ? "" : "text-muted-foreground")}>
                  {progress ? progress.open : COPY.unreadable}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
