"use client";

import {useEffect, useLayoutEffect, useRef, useState} from "react";
import {createPortal} from "react-dom";
import Link from "next/link";
import {useLinkStatus} from "next/link";
import {usePathname} from "next/navigation";
import {cn} from "@pakfactory/ui/lib/utils";
import {
  siteNavItemHasPanel,
  type SiteNavItem,
} from "@pakfactory/ui/components/site-nav";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@pakfactory/ui/components/navigation-menu";
import {SiteNavMegaPanel} from "@pakfactory/ui/components/site-nav-mega-panel";
import {PageDielineSection} from "@pakfactory/ui/components/page-dieline-section";

type SiteNavLinksProps = {
  items: SiteNavItem[];
};

/** Apple globalnav chrome easing (apple.com). */
const MEGA_EASE = "ease-[cubic-bezier(0.4,0,0.6,1)]";

/** Allow pointer to travel from trigger into the portaled sheet before close. */
const MEGA_CLOSE_GRACE_MS = 120;

export function isSiteNavHrefActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLinkLabel({label}: {label: string}) {
  const {pending} = useLinkStatus();
  return (
    <span className={cn("transition-colors", pending && "text-primary/70")}>
      {label}
    </span>
  );
}

/**
 * Desktop primary nav. Items with a mega `panel` open a header-scoped sheet
 * (portaled under `[data-site-nav-header]`); others are flat links.
 */
export function SiteNavLinks({items}: SiteNavLinksProps) {
  const pathname = usePathname();
  const [openValue, setOpenValue] = useState("");
  const [headerEl, setHeaderEl] = useState<HTMLElement | null>(null);
  const sheetHoverRef = useRef(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useLayoutEffect(() => {
    setHeaderEl(
      document.querySelector<HTMLElement>("[data-site-nav-header]"),
    );
  }, []);

  useLayoutEffect(() => {
    return () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    sheetHoverRef.current = false;
    setOpenValue("");
  }, [pathname]);

  function closeMega() {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    sheetHoverRef.current = false;
    setOpenValue("");
  }

  if (items.length === 0) return null;

  const hasAnyPanel = items.some(siteNavItemHasPanel);

  if (!hasAnyPanel) {
    return (
      <nav
        className="hidden items-center gap-6 text-sm font-semibold md:flex"
        aria-label="Site navigation"
      >
        {items.map((item) => {
          if (item.href) {
            const isActive = isSiteNavHrefActive(pathname, item.href);
            return (
              <Link
                key={item.key}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "py-2 no-underline transition-colors hover:text-muted-foreground",
                  isActive ? "text-primary" : "text-foreground",
                )}
              >
                <NavLinkLabel label={item.label} />
              </Link>
            );
          }

          return (
            <span
              key={item.key}
              className="cursor-default py-2 text-foreground"
              aria-disabled="true"
            >
              {item.label}
            </span>
          );
        })}
      </nav>
    );
  }

  const handleOpenChange = (next: string) => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    if (next) {
      setOpenValue(next);
      return;
    }
    // Grace period: pointer leaving triggers often crosses into the portaled sheet.
    closeTimerRef.current = setTimeout(() => {
      closeTimerRef.current = null;
      if (!sheetHoverRef.current) setOpenValue("");
    }, MEGA_CLOSE_GRACE_MS);
  };

  const openItem = items.find(
    (item) =>
      item.key === openValue && siteNavItemHasPanel(item) && item.panel,
  );
  const openPanel = openItem?.panel ?? null;

  const megaLayer =
    headerEl && openPanel
      ? createPortal(
          <>
            <button
              type="button"
              aria-label="Close menu"
              className={cn(
                "fixed inset-x-0 bottom-0 top-[var(--site-nav-offset,4.5rem)] z-40",
                "bg-[rgba(232,232,237,0.4)] backdrop-blur-[20px]",
                "animate-in fade-in fill-mode-both duration-[320ms] delay-80",
                MEGA_EASE,
                "motion-reduce:animate-none motion-reduce:transition-none",
              )}
              onClick={() => {
                sheetHoverRef.current = false;
                setOpenValue("");
              }}
            />
            <div
              className={cn(
                "absolute inset-x-0 top-full z-50",
                "animate-in fade-in slide-in-from-top-1 fill-mode-both duration-[320ms] delay-80",
                MEGA_EASE,
                "motion-reduce:animate-none motion-reduce:slide-in-from-top-0",
              )}
              onPointerEnter={() => {
                sheetHoverRef.current = true;
                if (closeTimerRef.current) {
                  clearTimeout(closeTimerRef.current);
                  closeTimerRef.current = null;
                }
              }}
              onPointerLeave={() => {
                sheetHoverRef.current = false;
                setOpenValue("");
              }}
            >
              <PageDielineSection
                borderTop
                borderBottom={false}
                paddingBlock="none"
                flush
                className="overflow-hidden rounded-b-md bg-popover text-popover-foreground shadow-md"
              >
                <SiteNavMegaPanel
                  panel={openPanel}
                  onNavigate={closeMega}
                  className="w-full max-w-none"
                />
              </PageDielineSection>
            </div>
          </>,
          headerEl,
        )
      : null;

  return (
    <>
      {megaLayer}
      <NavigationMenu
        value={openValue}
        onValueChange={handleOpenChange}
        viewport={false}
        delayDuration={120}
        className="hidden max-w-none md:flex"
      >
        <NavigationMenuList className="gap-1">
          {items.map((item) => {
            if (siteNavItemHasPanel(item) && item.panel) {
              return (
                <NavigationMenuItem key={item.key} value={item.key}>
                  <NavigationMenuTrigger
                    className={cn(
                      "h-auto bg-transparent px-3 py-2 text-sm font-semibold text-foreground shadow-none",
                      "hover:bg-transparent hover:text-muted-foreground",
                      "focus:bg-transparent focus:text-muted-foreground",
                      "focus-visible:bg-transparent",
                      "data-[state=open]:bg-transparent data-[state=open]:text-muted-foreground",
                      "data-[state=open]:hover:bg-transparent data-[state=open]:focus:bg-transparent",
                      "data-[state=open]:hover:text-muted-foreground",
                    )}
                  >
                    {item.label}
                  </NavigationMenuTrigger>
                  {/* Radix association only — visible sheet is portaled to the header */}
                  <NavigationMenuContent className="hidden" aria-hidden>
                    <span className="sr-only">{item.label} menu</span>
                  </NavigationMenuContent>
                </NavigationMenuItem>
              );
            }

            if (item.href) {
              const isActive = isSiteNavHrefActive(pathname, item.href);
              return (
                <NavigationMenuItem key={item.key} value={item.key}>
                  <NavigationMenuLink asChild>
                    <Link
                      href={item.href}
                      aria-current={isActive ? "page" : undefined}
                      className={cn(
                        "inline-flex items-center rounded-md px-3 py-2 text-sm font-semibold no-underline transition-colors",
                        "hover:bg-transparent hover:text-muted-foreground",
                        "focus:bg-transparent focus:text-muted-foreground",
                        "data-[active=true]:bg-transparent",
                        isActive ? "text-primary" : "text-foreground",
                      )}
                    >
                      <NavLinkLabel label={item.label} />
                    </Link>
                  </NavigationMenuLink>
                </NavigationMenuItem>
              );
            }

            return (
              <NavigationMenuItem key={item.key} value={item.key}>
                <span className="inline-flex cursor-default px-3 py-2 text-sm font-semibold text-foreground">
                  {item.label}
                </span>
              </NavigationMenuItem>
            );
          })}
        </NavigationMenuList>
      </NavigationMenu>
    </>
  );
}
