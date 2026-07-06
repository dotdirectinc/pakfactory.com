import type { PostBodyBarChart } from "@/lib/blog-post";

type BodyBarChartProps = {
  value: PostBodyBarChart;
};

/** Inline bar chart authored in the post body portable text. Dependency-free. */
export function BodyBarChart({ value }: BodyBarChartProps) {
  const data = (value.data ?? []).filter(
    (d) => typeof d.value === "number" && Number.isFinite(d.value),
  );
  if (data.length === 0) return null;

  const max = Math.max(...data.map((d) => d.value ?? 0), 1);
  const title = value.title?.trim();
  const source = value.source?.trim();

  return (
    <figure className="my-8 rounded-lg border border-border p-6">
      {title ? (
        <figcaption className="mb-6 text-sm font-semibold text-foreground">
          {title}
        </figcaption>
      ) : null}

      {/* Visual bars — decorative; the sr-only table below is the text alternative. */}
      <div className="flex items-end justify-between gap-2 sm:gap-4" aria-hidden="true">
        {data.map((d, i) => {
          const height = max > 0 ? Math.max(2, ((d.value ?? 0) / max) * 100) : 0;
          return (
            <div key={i} className="flex flex-1 flex-col items-center gap-2">
              <div className="flex h-40 w-full items-end">
                <div
                  className="w-full rounded-t bg-[var(--color-chart-1)]"
                  style={{ height: `${height}%` }}
                />
              </div>
              <span className="text-center text-xs text-muted-foreground">
                {d.label}
              </span>
            </div>
          );
        })}
      </div>

      <table className="sr-only">
        <caption>{title || "Bar chart data"}</caption>
        <thead>
          <tr>
            <th scope="col">Label</th>
            <th scope="col">Value</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d, i) => (
            <tr key={i}>
              <td>{d.label}</td>
              <td>{d.value}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {source ? (
        <p className="mt-4 text-xs text-muted-foreground">{source}</p>
      ) : null}
    </figure>
  );
}
