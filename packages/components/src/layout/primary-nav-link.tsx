"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { cn } from "@pakfactory/ui/lib/utils";
import type { PrimaryNavItem } from "./primary-nav-types";

type PrimaryNavLinkProps = {
  item: PrimaryNavItem;
  className?: string;
  onClick?: () => void;
  trailing?: ReactNode;
  activeClassName?: string;
};

function isPrimaryNavItemActive(
  pathname: string,
  item: PrimaryNavItem,
): boolean {
  if (item.external) return false;

  const { href, categorySlug } = item;
  if (categorySlug) {
    return pathname === href || pathname.startsWith(`${href}/page/`);
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function PrimaryNavLink({
  item,
  className,
  onClick,
  trailing,
  activeClassName = "font-semibold text-primary",
}: PrimaryNavLinkProps) {
  const pathname = usePathname();
  const isActive = isPrimaryNavItemActive(pathname, item);
  const content = (
    <>
      {item.label}
      {trailing}
    </>
  );

  if (item.external) {
    // Cross-app links (e.g. the blog under the same domain) render as a plain
    // anchor for a full navigation, but stay in the same tab (no target=_blank).
    return (
      <a href={item.href} onClick={onClick} className={className}>
        {content}
      </a>
    );
  }

  return (
    <Link
      href={item.href}
      onClick={onClick}
      className={cn(className, isActive && activeClassName)}
    >
      {content}
    </Link>
  );
}

export { isPrimaryNavItemActive };
