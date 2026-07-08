import { cn } from "@pakfactory/ui/lib/utils";
import { CAPTION_CLASS } from "@/lib/blog-caption";
import type { PostBodyTable } from "@/lib/blog-post";

type BodyTableProps = {
  value: PostBodyTable;
};

/** Inline data / comparison table authored in the post body portable text. */
export function BodyTable({ value }: BodyTableProps) {
  const columns = (value.columns ?? []).map((c) => c?.trim() ?? "");
  const rows = value.rows ?? [];
  if (columns.length === 0 || rows.length === 0) return null;

  const caption = value.caption?.trim();
  const isComparison = value.variant === "comparison";

  return (
    <figure className="my-8">
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr
              className={cn(
                "border-b border-border",
                isComparison ? "bg-muted" : "bg-muted/40",
              )}
            >
              {columns.map((col, i) => (
                <th
                  key={i}
                  scope="col"
                  className="px-4 py-3 font-semibold text-foreground"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, r) => (
              <tr
                key={row._key ?? r}
                className={cn(
                  "border-b border-border last:border-0",
                  // Comparison style: zebra striping for readability.
                  isComparison && r % 2 === 1 && "bg-muted/20",
                )}
              >
                {/* Normalize each row to the column count so mismatched rows degrade gracefully. */}
                {columns.map((_, c) => {
                  const content = row.cells?.[c]?.trim() ?? "";
                  // Comparison style: the first column is a bold row label.
                  if (isComparison && c === 0) {
                    return (
                      <th
                        key={c}
                        scope="row"
                        className="px-4 py-3 text-left align-top font-medium text-foreground"
                      >
                        {content}
                      </th>
                    );
                  }
                  return (
                    <td
                      key={c}
                      className="px-4 py-3 align-top text-muted-foreground"
                    >
                      {content}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {caption ? (
        <figcaption className={CAPTION_CLASS}>{caption}</figcaption>
      ) : null}
    </figure>
  );
}
