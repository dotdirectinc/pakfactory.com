"use client";

import {
  useLayoutEffect,
  useRef,
  type CSSProperties,
  type ReactNode,
} from "react";
import Link from "next/link";
import {Box, ClipboardList, ClipboardPlus} from "lucide-react";
import {Button} from "@pakfactory/ui/components/button";
import {Separator} from "@pakfactory/ui/components/separator";
import {PageDielineSection} from "@pakfactory/ui/components/page-dieline-section";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@pakfactory/ui/components/tooltip";
import {cn} from "@pakfactory/ui/lib/utils";
import {SiteNavLinks} from "@pakfactory/ui/components/site-nav-links";
import {SiteNavMobile} from "@pakfactory/ui/components/site-nav-mobile";

export type SiteNavCta = {
  href: string;
  label: string;
};

export type SiteNavPanelLink = {
  label: string;
  href: string;
  external?: boolean;
};

export type SiteNavPanelGroup = {
  key: string;
  label: string;
  descriptor?: string;
  links: SiteNavPanelLink[];
};

/** Featured card; omit from UI when empty (no heading/image/href). */
export type SiteNavPanelPromo = {
  heading?: string;
  imageUrl?: string;
  imageAlt?: string;
  href?: string;
  external?: boolean;
};

export type SiteNavPanel = {
  groups: SiteNavPanelGroup[];
  promo?: SiteNavPanelPromo | null;
  /** Stripe-style second-row link under the grid (e.g. See all products). */
  footerCta?: SiteNavPanelLink | null;
};

export type SiteNavItem = {
  key: string;
  label: string;
  href?: string;
  /** When set with groups and/or promo, desktop/mobile render a mega-menu. */
  panel?: SiteNavPanel;
};

export type SiteNavRequest = {
  href: string;
  count: number;
  label: string;
};

export type SiteNavProps = {
  homeHref?: string;
  logo?: ReactNode;
  items: SiteNavItem[];
  cta: SiteNavCta;
  /** Sign-in / Account link, rendered with the request clipboard (after the divider). */
  signIn?: SiteNavCta;
  /** Takes the signIn link's place on desktop when the visitor has a session. */
  account?: ReactNode;
  request?: SiteNavRequest;
  /**
   * Optional desktop nav override (e.g. www MegaMenu). When omitted,
   * {@link SiteNavLinks} renders flat + mega items from `items`.
   */
  desktopNav?: ReactNode;
};

export function siteNavPromoIsVisible(
  promo: SiteNavPanelPromo | null | undefined,
): boolean {
  if (!promo) return false;
  return Boolean(
    promo.heading?.trim() ||
      promo.imageUrl?.trim() ||
      promo.href?.trim(),
  );
}

export function siteNavItemHasPanel(item: SiteNavItem): boolean {
  if (!item.panel) return false;
  const hasGroups = item.panel.groups.some((g) => g.links.length > 0);
  return hasGroups || siteNavPromoIsVisible(item.panel.promo);
}

function DefaultLogo() {
  return (
    <>
      <Box
        className="size-8 text-foreground"
        strokeWidth={1.75}
        aria-hidden
      />
      <span className="text-xl font-semibold tracking-tight text-foreground">
        PakFactory
      </span>
    </>
  );
}

export function SiteNav({
  homeHref = "/",
  logo,
  items,
  cta,
  signIn,
  account,
  request,
  desktopNav,
}: SiteNavProps) {
  const headerRef = useRef<HTMLElement>(null);
  const requestCount = request?.count ?? 0;
  const requestAria =
    request && requestCount > 0
      ? `${request.label}, ${requestCount} ${requestCount === 1 ? "item" : "items"}`
      : request?.label;

  useLayoutEffect(() => {
    const el = headerRef.current;
    if (!el) return;

    const syncOffset = () => {
      el.style.setProperty("--site-nav-offset", `${el.offsetHeight}px`);
    };
    syncOffset();

    const observer = new ResizeObserver(syncOffset);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <header
      ref={headerRef}
      data-site-nav-header=""
      className="relative z-50 border-b border-dashed border-border bg-background"
      style={{"--site-nav-offset": "4.5rem"} as CSSProperties}
    >
      <PageDielineSection
        paddingBlock="xs"
        innerClassName="flex items-center justify-between"
      >
        <Link
          href={homeHref}
          className="flex shrink-0 items-center gap-3 no-underline"
        >
          {logo ?? <DefaultLogo />}
        </Link>

        <div className="flex items-center gap-5">
          {desktopNav ?? <SiteNavLinks items={items} />}
          <SiteNavMobile
            items={items}
            cta={cta}
            signIn={signIn}
            request={request}
          />

          <Separator orientation="vertical" className="hidden !h-6 md:block" />

          {signIn || account || request ? (
            <div className="hidden items-center gap-2 md:flex">
              {request ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="relative size-9"
                      aria-label={requestAria}
                      asChild
                    >
                      <Link href={request.href}>
                        {requestCount > 0 ? (
                          <ClipboardList className="size-6" strokeWidth={1.75} />
                        ) : (
                          <ClipboardPlus className="size-6" strokeWidth={1.75} />
                        )}
                        {requestCount > 0 ? (
                          <span
                            className={cn(
                              "pointer-events-none absolute -right-0.5 -bottom-0.5 flex min-h-4 min-w-4 items-center justify-center rounded-full bg-foreground px-1 text-[10px] leading-none font-semibold text-background ring-2 ring-background",
                              requestCount > 99 && "px-1.5 text-[9px]",
                            )}
                          >
                            {requestCount > 99 ? "99+" : requestCount}
                          </span>
                        ) : null}
                      </Link>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent
                    side="bottom"
                    sideOffset={8}
                    variant="pill"
                  >
                    {request.label}
                  </TooltipContent>
                </Tooltip>
              ) : null}
              {account ??
                (signIn ? (
                  <Link
                    href={signIn.href}
                    className="py-2 text-base font-medium text-foreground no-underline transition-colors hover:text-foreground/80"
                  >
                    {signIn.label}
                  </Link>
                ) : null)}
            </div>
          ) : null}

          <Button
            size="lg"
            className="hidden sm:inline-flex"
            asChild
          >
            <Link href={cta.href}>{cta.label}</Link>
          </Button>
        </div>
      </PageDielineSection>
    </header>
  );
}
