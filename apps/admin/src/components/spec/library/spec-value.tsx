import { Badge } from "@pakfactory/ui/components/badge";
import { LocalTime } from "@pakfactory/ui/components/local-time";
import { cn } from "@pakfactory/ui/lib/utils";
import { collectionLabel } from "@/lib/spec/library-review";
import { isUuid, labelOf, shapeOf, toneOf, type SpecRefs } from "@/lib/spec/library-display";

export const WARNING_BADGE = "border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-300";

/**
 * A record id or code as a reviewer reads it: the name, with the code beside it in mono. Resolved
 * through `refs` (backend 20261117220000); an unresolved code shows as itself, an unresolved uuid
 * shortened, so nothing pretends to be a name it is not.
 */
export function RefChip({ value, refs }: { value: string; refs?: SpecRefs }) {
  const ref = refs?.[value];
  const code = ref?.sourceId ?? (isUuid(value) ? `${value.slice(0, 8)}…` : value);
  const title = ref ? `${collectionLabel(ref.collection)} · ${ref.sourceId}` : value;
  return (
    <span
      title={title}
      className="inline-flex max-w-full items-baseline gap-2 rounded-md border border-border bg-muted/40 px-2 py-0.5 text-sm"
    >
      {ref?.name ? <span className="truncate">{ref.name}</span> : null}
      <span className={cn("shrink-0 font-mono text-xs", ref?.name ? "text-muted-foreground" : "text-foreground")}>{code}</span>
    </span>
  );
}

/** A known short value (status, severity, verification …) as a coloured badge. */
export function FactBadge({ field, value }: { field: string; value: unknown }) {
  const tone = toneOf(field, value);
  return (
    <Badge variant={tone === "warning" ? "outline" : tone} className={cn("gap-1", tone === "warning" && WARNING_BADGE)}>
      <span className="font-normal opacity-70">{labelOf(field)}:</span> {String(value)}
    </Badge>
  );
}

/** Any stored value, drawn by its shape: text, yes/no, a ref, a date, chips, a small table, a nested list. */
export function SpecValue({ value, refs, depth = 0 }: { value: unknown; refs?: SpecRefs; depth?: number }) {
  const s = shapeOf(value);
  switch (s.kind) {
    case "empty":
      return <span className="text-muted-foreground">—</span>;
    case "bool":
      return <span>{s.value ? "Yes" : "No"}</span>;
    case "text":
      return <span className="whitespace-pre-wrap break-words">{s.value}</span>;
    case "ref":
      return <RefChip value={s.value} refs={refs} />;
    case "date":
      return <LocalTime iso={s.value} preset="dateTime" />;
    case "chips":
      return (
        <span className="flex flex-wrap gap-2">
          {s.values.map((v, i) => (
            <SpecValue key={i} value={v} refs={refs} depth={depth + 1} />
          ))}
        </span>
      );
    case "map":
      return (
        <dl className={cn("grid grid-cols-[minmax(6rem,auto)_1fr] gap-x-4 gap-y-1", depth > 0 && "border-l border-border pl-4")}>
          {s.entries.map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="text-muted-foreground">{labelOf(k)}</dt>
              <dd className="min-w-0">
                <SpecValue value={v} refs={refs} depth={depth + 1} />
              </dd>
            </div>
          ))}
        </dl>
      );
    case "table":
      return <RowsTable columns={s.columns} rows={s.rows} refs={refs} />;
    case "json":
      return (
        <pre className="max-h-80 overflow-auto rounded-md bg-muted/40 p-2 font-mono text-xs">{JSON.stringify(s.value, null, 2)}</pre>
      );
  }
}

export function RowsTable({ columns, rows, refs }: { columns: string[]; rows: Record<string, unknown>[]; refs?: SpecRefs }) {
  return (
    <div className="overflow-x-auto rounded-md border border-border">
      <table className="w-full text-sm">
        <thead className="bg-muted/40">
          <tr className="text-left">
            {columns.map((c) => (
              <th key={c} className="px-3 py-2 text-xs font-medium text-muted-foreground">
                {labelOf(c)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t border-border align-top">
              {columns.map((c) => (
                <td key={c} className="px-3 py-2">
                  <SpecValue value={r[c]} refs={refs} depth={1} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
