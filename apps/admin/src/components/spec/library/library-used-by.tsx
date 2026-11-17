import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@pakfactory/ui/components/card";
import { productTypeReviewHref, type LineProductTypes } from "@/lib/spec/library-usage";
import { ADMIN_SPEC_LIBRARY_COPY } from "@/lib/copy/spec-library";

const COPY = ADMIN_SPEC_LIBRARY_COPY.usedBy;

/**
 * On a template or capability record (PLAT-81): the product types it applies to, by line, each
 * opening that product type's review. A shared record is approved once for all of them; this makes
 * that visible before deciding. Lines fold away when the list is long.
 */
export function LibraryUsedBy({ groups }: { groups: LineProductTypes[] | null }) {
  if (!groups) {
    return <p className="text-sm text-muted-foreground">{COPY.unknown}</p>;
  }
  const total = groups.reduce((n, g) => n + g.items.length, 0);
  const fold = total > 12;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{COPY.heading(total)}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 text-sm">
        <p className="text-muted-foreground">{COPY.lead(total)}</p>
        {groups.map((g) => (
          <details key={g.line} open={!fold || groups.length === 1} className="group">
            <summary className="cursor-pointer font-medium">
              {g.label} <span className="font-normal text-muted-foreground">{g.items.length}</span>
            </summary>
            <ul className="mt-2 flex flex-col gap-1 pl-4">
              {g.items.map((i) => (
                <li key={i.sourceId} className="flex flex-wrap items-baseline gap-x-2">
                  <Link href={productTypeReviewHref(i.sourceId)} className="underline-offset-4 hover:underline">
                    {i.label ?? i.sourceId}
                  </Link>
                  <span className="font-mono text-xs text-muted-foreground">{i.sourceId}</span>
                </li>
              ))}
            </ul>
          </details>
        ))}
      </CardContent>
    </Card>
  );
}
