import { Fragment } from "react";
import Link from "next/link";
import {
  Breadcrumb as UIBreadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@pakfactory/ui/components/breadcrumb";

export type Crumb = { label: string; href?: string };

/**
 * Shared breadcrumb trail. Callers pass the crumbs; the last one renders as the
 * current page (no link). Appears on most blog pages per the wireframe.
 *
 * Composes the @pakfactory/ui breadcrumb primitive so styling stays in sync
 * with the design system; this wrapper just adapts the ergonomic `items[]` API
 * and keeps the blog's "/" separator.
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
                  <BreadcrumbLink asChild>
                    <Link href={item.href}>{item.label}</Link>
                  </BreadcrumbLink>
                ) : isLast ? (
                  <BreadcrumbPage>{item.label}</BreadcrumbPage>
                ) : (
                  <span>{item.label}</span>
                )}
              </BreadcrumbItem>
              {!isLast && <BreadcrumbSeparator>/</BreadcrumbSeparator>}
            </Fragment>
          );
        })}
      </BreadcrumbList>
    </UIBreadcrumb>
  );
}
