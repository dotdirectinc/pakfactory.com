import { cn } from "@pakfactory/ui/lib/utils";
import { CAPTION_CLASS } from "@/lib/blog-caption";
import type { PostBodyTable } from "@/lib/blog-post";

type BodyTableProps = {
  value: PostBodyTable;
};

// First column: ~40% on mobile (fixed), 35% on desktop. It stays sticky while
// the rest scrolls horizontally, so it needs an opaque per-row background.
const FIRST_COL_WIDTH = "w-[150px] sm:w-[35%]";

/** Inline data / comparison table authored in the post body portable text. */
export function BodyTable({ value }: BodyTableProps) {
  const columns = (value.columns ?? []).map((c) => c?.trim() ?? "");
  const rows = value.rows ?? [];
  if (columns.length === 0 || rows.length === 0) return null;

  const caption = value.caption?.trim();
  const isComparison = value.variant === "comparison";

  return (
    <figure className="my-8">
      {/* Padded card. The inner div is the horizontal scroll container; its
          styled (always-visible when scrollable) bottom scrollbar signals that
          the table scrolls sideways. */}
      <div className="rounded-2xl border border-border/60 bg-card p-2 sm:p-3">
        <div className="overflow-x-auto [scrollbar-color:var(--color-muted-foreground)_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-foreground/25 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar]:h-1.5">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-border/60">
                {columns.map((col, i) => (
                  <th
                    key={i}
                    scope="col"
                    className={cn(
                      "px-6 py-4 align-bottom font-medium text-muted-foreground",
                      i === 0
                        ? cn("sticky left-0 z-10 bg-card", FIRST_COL_WIDTH)
                        : "min-w-[200px]",
                    )}
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, r) => {
                // Zebra: even rows match the card; odd rows get a subtle
                // beige highlight (bg-muted) that fits the warm theme.
                const rowBg = r % 2 === 1 ? "bg-muted" : "bg-card";
                return (
                  <tr key={row._key ?? r}>
                    {/* Normalize each row to the column count so mismatched rows degrade gracefully. */}
                    {columns.map((_, c) => {
                      const content = row.cells?.[c]?.trim() ?? "";
                      if (c === 0) {
                        return (
                          <th
                            key={c}
                            scope="row"
                            className={cn(
                              "sticky left-0 z-10 px-6 py-5 text-left align-middle text-foreground",
                              FIRST_COL_WIDTH,
                              rowBg,
                              isComparison ? "font-semibold" : "font-medium",
                            )}
                          >
                            {content}
                          </th>
                        );
                      }
                      return (
                        <td
                          key={c}
                          className={cn(
                            "min-w-[200px] px-6 py-5 align-middle text-foreground",
                            rowBg,
                          )}
                        >
                          {content}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      {caption ? (
        <figcaption className={CAPTION_CLASS}>{caption}</figcaption>
      ) : null}
    </figure>
  );
}
