import { Fragment } from "react";
import Link from "next/link";
import { Slash } from "lucide-react";
import {
  Breadcrumb as UIBreadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@pakfactory/ui/components/breadcrumb";

export type Crumb = { label: string; href?: string };

/** Earlier (non-current) crumbs: medium, faded, brighten on hover (POC breadcrumb). */
const CRUMB_CLASS = "font-medium opacity-60 hover:opacity-100";

/**
 * Shared breadcrumb trail. Callers pass the crumbs; the last one renders as the
 * current page (no link). Appears on most blog pages per the wireframe.
 *
 * Composes the @pakfactory/ui breadcrumb primitive (already `text-xs`) and
 * matches the POC breadcrumb: faded medium earlier crumbs, a diagonal `Slash`
 * separator, and a solid `font-medium` current page.
 */
export function Breadcrumb({ items }: { items: Crumb[] }) {
  if (items.length === 0) return null;

  return (
    <UIBreadcrumb>
      <BreadcrumbList>
        {items.map((item, i) => {
          const isLast = i === items.length - 1;
          return (
            <Fragment key={`${item.label}-${i}`}>
              <BreadcrumbItem>
                {item.href && !isLast ? (
                  <BreadcrumbLink asChild className={CRUMB_CLASS}>
                    <Link href={item.href}>{item.label}</Link>
                  </BreadcrumbLink>
                ) : isLast ? (
                  <BreadcrumbPage className="font-medium">
                    {item.label}
                  </BreadcrumbPage>
                ) : (
                  <span className={CRUMB_CLASS}>{item.label}</span>
                )}
              </BreadcrumbItem>
              {!isLast && (
                <BreadcrumbSeparator>
                  <Slash
                    className="text-muted-foreground/50"
                    strokeWidth={1.75}
                    aria-hidden
                  />
                </BreadcrumbSeparator>
              )}
            </Fragment>
          );
        })}
      </BreadcrumbList>
    </UIBreadcrumb>
  );
}
