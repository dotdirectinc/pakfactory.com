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
  type SiteNavPanel,
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

/** Shared enter motion for curtain + sheet. */
const MEGA_ENTER =
  "animate-in fade-in slide-in-from-top-1 fill-mode-both duration-200";

/** Shared exit motion (mirrors enter); unmount after this duration. */
const MEGA_EXIT =
  "animate-out fade-out slide-out-to-top-1 fill-mode-both duration-200";
const MEGA_EXIT_MS = 200;

/** Hover opens immediately (no Radix intent delay). */
const MEGA_OPEN_DELAY_MS = 0;

/** No re-wait when moving between Products / Solutions while open. */
const MEGA_SKIP_DELAY_MS = 0;

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
  const [isExiting, setIsExiting] = useState(false);
  const [exitPanel, setExitPanel] = useState<SiteNavPanel | null>(null);
  const [headerEl, setHeaderEl] = useState<HTMLElement | null>(null);
  const sheetHoverRef = useRef(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const exitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const openValueRef = useRef(openValue);
  const isExitingRef = useRef(isExiting);
  openValueRef.current = openValue;
  isExitingRef.current = isExiting;

  useLayoutEffect(() => {
    setHeaderEl(
      document.querySelector<HTMLElement>("[data-site-nav-header]"),
    );
  }, []);

  useLayoutEffect(() => {
    return () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
      if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
    };
  }, []);

  function clearCloseTimer() {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }

  function clearExitTimer() {
    if (exitTimerRef.current) {
      clearTimeout(exitTimerRef.current);
      exitTimerRef.current = null;
    }
  }

  function cancelExit() {
    clearExitTimer();
    setIsExiting(false);
    setExitPanel(null);
  }

  function resetMegaInstant() {
    clearCloseTimer();
    clearExitTimer();
    sheetHoverRef.current = false;
    setOpenValue("");
    setIsExiting(false);
    setExitPanel(null);
  }

  /** Animate curtain+sheet out, then unmount. */
  function beginExit() {
    if (isExitingRef.current) return;

    const currentKey = openValueRef.current;
    if (!currentKey) return;

    const item = items.find(
      (i) => i.key === currentKey && siteNavItemHasPanel(i) && i.panel,
    );
    if (!item?.panel) {
      resetMegaInstant();
      return;
    }

    clearCloseTimer();
    clearExitTimer();
    sheetHoverRef.current = false;
    setExitPanel(item.panel);
    setIsExiting(true);
    setOpenValue("");

    exitTimerRef.current = setTimeout(() => {
      exitTimerRef.current = null;
      setIsExiting(false);
      setExitPanel(null);
    }, MEGA_EXIT_MS);
  }

  useEffect(() => {
    resetMegaInstant();
    // Route change: snappy clear, no exit animation.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- pathname-only reset
  }, [pathname]);

  function closeMega() {
    beginExit();
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
    clearCloseTimer();
    if (next) {
      cancelExit();
      setOpenValue(next);
      return;
    }
    // Grace period: pointer leaving triggers often crosses into the portaled sheet.
    closeTimerRef.current = setTimeout(() => {
      closeTimerRef.current = null;
      if (!sheetHoverRef.current) beginExit();
    }, MEGA_CLOSE_GRACE_MS);
  };

  const openItem = items.find(
    (item) =>
      item.key === openValue && siteNavItemHasPanel(item) && item.panel,
  );
  const openPanel = openItem?.panel ?? null;
  const renderedPanel = openPanel ?? (isExiting ? exitPanel : null);
  const motionClass = isExiting ? MEGA_EXIT : MEGA_ENTER;

  const megaLayer =
    headerEl && renderedPanel
      ? createPortal(
          <>
            <button
              type="button"
              aria-label="Close menu"
              className={cn(
                "fixed inset-x-0 bottom-0 top-[var(--site-nav-offset,4.5rem)] z-40",
                "bg-[rgba(232,232,237,0.4)] backdrop-blur-[20px]",
                motionClass,
                MEGA_EASE,
                "motion-reduce:animate-none motion-reduce:slide-in-from-top-0 motion-reduce:transition-none",
                isExiting && "pointer-events-none",
              )}
              onClick={() => {
                beginExit();
              }}
            />
            <div
              className={cn(
                "absolute inset-x-0 top-full z-50",
                motionClass,
                MEGA_EASE,
                "motion-reduce:animate-none motion-reduce:slide-in-from-top-0",
                isExiting && "pointer-events-none",
              )}
              onPointerEnter={() => {
                if (isExitingRef.current) return;
                sheetHoverRef.current = true;
                clearCloseTimer();
              }}
              onPointerLeave={() => {
                sheetHoverRef.current = false;
                beginExit();
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
                  panel={renderedPanel}
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
        delayDuration={MEGA_OPEN_DELAY_MS}
        skipDelayDuration={MEGA_SKIP_DELAY_MS}
        className="hidden max-w-none md:flex"
      >
        <NavigationMenuList className="gap-1">
          {items.map((item) => {
            if (siteNavItemHasPanel(item) && item.panel) {
              return (
                <NavigationMenuItem key={item.key} value={item.key}>
                  <NavigationMenuTrigger
                    className={cn(
                      "h-auto cursor-default bg-transparent px-3 py-2 text-sm font-semibold text-foreground shadow-none",
                      "hover:bg-transparent hover:text-muted-foreground",
                      "focus:bg-transparent focus:text-muted-foreground",
                      "focus-visible:bg-transparent",
                      "data-[state=open]:bg-transparent data-[state=open]:text-muted-foreground",
                      "data-[state=open]:hover:bg-transparent data-[state=open]:focus:bg-transparent",
                      "data-[state=open]:hover:text-muted-foreground",
                    )}
                    onPointerDown={(event) => event.preventDefault()}
                    onClick={(event) => event.preventDefault()}
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
