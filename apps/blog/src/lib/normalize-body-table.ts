import type { PostBodyTable, PostBodyTableColumn } from "@/lib/blog-post";

export type NormalizedBodyTable = {
  variant?: "data" | "comparison";
  caption?: string;
  columns: string[];
  rows: Array<{ _key?: string; cells: string[] }>;
};

function cellValue(cell: unknown): string {
  if (typeof cell === "string") return cell.trim();
  if (
    cell &&
    typeof cell === "object" &&
    "value" in cell &&
    typeof (cell as { value?: unknown }).value === "string"
  ) {
    return ((cell as { value: string }).value).trim();
  }
  return "";
}

function asColumnObject(
  column: PostBodyTableColumn,
): { _key?: string; header?: string; cells?: unknown[] } | null {
  if (column != null && typeof column === "object") {
    return column as { _key?: string; header?: string; cells?: unknown[] };
  }
  return null;
}

function isColumnMajor(columns: PostBodyTable["columns"]): boolean {
  if (!Array.isArray(columns) || columns.length === 0) return false;
  return columns.some((c) => asColumnObject(c) != null);
}

/**
 * Normalize bodyTable for HTML rendering.
 *
 * - Primary (PROD-2224 reverted): `columns: string[]` + `rows[].cells`.
 * - Dual-read: column-major `{ header, cells[] }` (brief column-first experiment)
 *   still transposes until reverse-migrated.
 * Blank headers are allowed. Short rows are padded by the renderer.
 */
export function normalizeBodyTable(
  value: PostBodyTable,
): NormalizedBodyTable | null {
  const variant = value.variant;
  const caption = value.caption;
  const rawColumns = value.columns ?? [];

  if (isColumnMajor(rawColumns)) {
    const cols = rawColumns
      .map((c) => asColumnObject(c))
      .filter((c): c is NonNullable<typeof c> => c != null);

    const headers = cols.map((c) =>
      typeof c.header === "string" ? c.header.trim() : "",
    );
    if (cols.length === 0) return null;

    const rowCount = Math.max(
      0,
      ...cols.map((c) => (Array.isArray(c.cells) ? c.cells.length : 0)),
    );
    if (rowCount === 0) return null;

    const rows = Array.from({ length: rowCount }, (_, r) => ({
      _key:
        cols
          .map((c) => {
            const cell = c.cells?.[r];
            return cell && typeof cell === "object" && "_key" in cell
              ? String((cell as { _key?: string })._key ?? "")
              : "";
          })
          .find(Boolean) || `r${r}`,
      cells: cols.map((c) => cellValue(c.cells?.[r])),
    }));

    return { variant, caption, columns: headers, rows };
  }

  const columns = rawColumns.map((c) =>
    typeof c === "string" ? c.trim() : "",
  );

  const rows = (value.rows ?? []).map((row, r) => ({
    _key: row._key ?? `r${r}`,
    cells: Array.isArray(row.cells)
      ? row.cells.map((c) => (typeof c === "string" ? c.trim() : ""))
      : [],
  }));

  if (columns.length === 0 || rows.length === 0) return null;

  return { variant, caption, columns, rows };
}
