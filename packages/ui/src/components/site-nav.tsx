"use client";

import type {ReactNode} from "react";
import Link from "next/link";
import {Box, FolderOpen, FolderPlus} from "lucide-react";
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

export type SiteNavItem = {
  key: string;
  label: string;
  href?: string;
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
  /** Sign-in / Account link, rendered with the request folder (after the divider). */
  signIn?: SiteNavCta;
  request?: SiteNavRequest;
};

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
  request,
}: SiteNavProps) {
  const requestCount = request?.count ?? 0;
  const requestAria =
    request && requestCount > 0
      ? `${request.label}, ${requestCount} ${requestCount === 1 ? "item" : "items"}`
      : request?.label;

  return (
    <header className="relative z-50 border-b border-dashed border-border bg-background">
      <PageDielineSection innerClassName="flex h-16 items-center justify-between">
        <Link
          href={homeHref}
          className="flex shrink-0 items-center gap-3 no-underline"
        >
          {logo ?? <DefaultLogo />}
        </Link>

        <div className="flex items-center gap-5">
          <SiteNavLinks items={items} />
          <SiteNavMobile
            items={items}
            cta={cta}
            signIn={signIn}
            request={request}
          />

          <Separator orientation="vertical" className="hidden !h-6 md:block" />

          {signIn || request ? (
            <div className="hidden items-center gap-4 md:flex">
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
                          <FolderOpen className="size-6" strokeWidth={1.75} />
                        ) : (
                          <FolderPlus className="size-6" strokeWidth={1.75} />
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
                    className="rounded-full px-3 py-1.5 text-[13px] font-medium [&>svg]:hidden"
                  >
                    {request.label}
                  </TooltipContent>
                </Tooltip>
              ) : null}
              {signIn ? (
                <Link
                  href={signIn.href}
                  className="py-2 text-base font-medium text-foreground no-underline transition-colors hover:text-foreground/80"
                >
                  {signIn.label}
                </Link>
              ) : null}
            </div>
          ) : null}

          <Button
            className="hidden h-10 rounded-full bg-primary px-6 text-base font-medium text-primary-foreground hover:bg-primary/90 sm:inline-flex"
            asChild
          >
            <Link href={cta.href}>{cta.label}</Link>
          </Button>
        </div>
      </PageDielineSection>
    </header>
  );
}
