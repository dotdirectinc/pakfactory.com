"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { Button } from "@pakfactory/ui/components/button";
import type { NavLink } from "@pakfactory/ui/components/site-nav";

type SiteNavMobileProps = {
  navLinks: NavLink[];
  getQuoteHref: string;
  ctaLabel: string;
};

export function SiteNavMobile({
  navLinks,
  getQuoteHref,
  ctaLabel,
}: SiteNavMobileProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close on route change
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Prevent body scroll while open
  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="size-9 lg:hidden"
        aria-label={open ? "Close navigation" : "Open navigation"}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        {open ? (
          <X className="size-5" strokeWidth={1.75} />
        ) : (
          <Menu className="size-5" strokeWidth={1.75} />
        )}
      </Button>

      {open && (
        <div
          className="fixed inset-x-0 top-16 z-40 h-[calc(100dvh-4rem)] overflow-y-auto bg-background lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Navigation menu"
        >
          <nav
            className="flex flex-col px-4 py-2 sm:px-6"
            aria-label="Mobile navigation"
          >
            {navLinks.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className="border-b border-dashed border-border py-5 text-lg font-medium text-foreground transition-colors hover:text-muted-foreground"
              >
                {label}
              </Link>
            ))}
          </nav>

          <div className="px-4 py-6 sm:px-6">
            <Button
              className="w-full rounded-full bg-primary text-base font-medium text-primary-foreground hover:bg-primary/90"
              size="lg"
              asChild
            >
              <a href={getQuoteHref}>{ctaLabel}</a>
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
