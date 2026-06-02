import Link from "next/link";

export type Crumb = { label: string; href?: string };

/**
 * Shared breadcrumb trail. Callers pass the crumbs; the last one renders as the
 * current page (no link). Appears on most blog pages per the wireframe.
 */
export function Breadcrumb({ items }: { items: Crumb[] }) {
  if (items.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
      <ol className="flex flex-wrap items-center gap-1.5">
        {items.map((item, i) => {
          const isLast = i === items.length - 1;
          return (
            <li key={`${item.label}-${i}`} className="flex items-center gap-1.5">
              {item.href && !isLast ? (
                <Link
                  href={item.href}
                  className="underline-offset-4 hover:text-foreground hover:underline"
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  className={isLast ? "text-foreground" : undefined}
                  aria-current={isLast ? "page" : undefined}
                >
                  {item.label}
                </span>
              )}
              {!isLast && (
                <span aria-hidden className="text-muted-foreground/60">
                  /
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
