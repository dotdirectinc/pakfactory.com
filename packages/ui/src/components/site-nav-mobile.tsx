"use client";

import {useEffect, useState} from "react";
import Link from "next/link";
import {Menu, X} from "lucide-react";
import {usePathname} from "next/navigation";
import {Button} from "@pakfactory/ui/components/button";
import {PageDielineSection} from "@pakfactory/ui/components/page-dieline-section";
import type {
  SiteNavCta,
  SiteNavItem,
  SiteNavRequest,
} from "@pakfactory/ui/components/site-nav";

type SiteNavMobileProps = {
  items: SiteNavItem[];
  cta: SiteNavCta;
  signIn?: SiteNavCta;
  request?: SiteNavRequest;
};

export function SiteNavMobile({items, cta, signIn, request}: SiteNavMobileProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  function close() {
    setOpen(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="inline-flex size-9 items-center justify-center rounded-2xl text-foreground md:hidden"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
      >
        {open ? <X className="size-6" /> : <Menu className="size-6" />}
      </button>

      {open ? (
        <div className="absolute inset-x-0 top-full z-50 max-h-[75vh] overflow-y-auto border-b border-border bg-background shadow-lg md:hidden">
          <PageDielineSection innerClassName="py-4">
            <nav className="mb-4 space-y-1" aria-label="Mobile navigation">
              {items.map((item) => {
                if (item.href) {
                  return (
                    <Link
                      key={item.key}
                      href={item.href}
                      onClick={close}
                      className="block py-2 text-sm font-medium text-foreground no-underline"
                    >
                      {item.label}
                    </Link>
                  );
                }

                return (
                  <span
                    key={item.key}
                    className="block py-2 text-sm font-medium text-foreground"
                    aria-disabled="true"
                  >
                    {item.label}
                  </span>
                );
              })}
            </nav>

            <div className="flex flex-col gap-2 border-t border-border pt-4">
              {request ? (
                <Button variant="outline" className="w-full" asChild>
                  <Link href={request.href} onClick={close}>
                    {request.label}
                    {request.count > 0 ? ` (${request.count})` : ""}
                  </Link>
                </Button>
              ) : null}
              {signIn ? (
                <Button variant="outline" className="w-full" asChild>
                  <Link href={signIn.href} onClick={close}>
                    {signIn.label}
                  </Link>
                </Button>
              ) : null}
              <Button className="w-full rounded-full" asChild>
                <Link href={cta.href} onClick={close}>
                  {cta.label}
                </Link>
              </Button>
            </div>
          </PageDielineSection>
        </div>
      ) : null}
    </>
  );
}
