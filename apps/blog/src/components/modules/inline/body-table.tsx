import type { PostBodyTable } from "@/lib/blog-post";

type BodyTableProps = {
  value: PostBodyTable;
};

/** Inline data table authored in the post body portable text. */
export function BodyTable({ value }: BodyTableProps) {
  const columns = (value.columns ?? []).map((c) => c?.trim() ?? "");
  const rows = value.rows ?? [];
  if (columns.length === 0 || rows.length === 0) return null;

  const caption = value.caption?.trim();

  return (
    <figure className="my-8">
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
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
                className="border-b border-border last:border-0"
              >
                {/* Normalize each row to the column count so mismatched rows degrade gracefully. */}
                {columns.map((_, c) => (
                  <td
                    key={c}
                    className="px-4 py-3 align-top text-muted-foreground"
                  >
                    {row.cells?.[c]?.trim() ?? ""}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {caption ? (
        <figcaption className="mt-2 text-sm text-muted-foreground">
          {caption}
        </figcaption>
      ) : null}
    </figure>
  );
}
