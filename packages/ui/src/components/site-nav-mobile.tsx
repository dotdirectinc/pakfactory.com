"use client";

import {useEffect, useState} from "react";
import Link from "next/link";
import Image from "next/image";
import {ChevronLeft, ChevronRight, Menu, X} from "lucide-react";
import {usePathname} from "next/navigation";
import {Button} from "@pakfactory/ui/components/button";
import {PageDielineSection} from "@pakfactory/ui/components/page-dieline-section";
import {
  siteNavItemHasPanel,
  siteNavPromoIsVisible,
  type SiteNavCta,
  type SiteNavItem,
  type SiteNavPanel,
  type SiteNavPanelGroup,
  type SiteNavPanelPromo,
  type SiteNavRequest,
} from "@pakfactory/ui/components/site-nav";
import {isSiteNavHrefActive} from "@pakfactory/ui/components/site-nav-links";
import {cn} from "@pakfactory/ui/lib/utils";

type SiteNavMobileProps = {
  items: SiteNavItem[];
  cta: SiteNavCta;
  signIn?: SiteNavCta;
  request?: SiteNavRequest;
};

type MobileView =
  | {kind: "root"}
  | {kind: "item"; itemKey: string}
  | {kind: "group"; itemKey: string; groupKey: string};

function MobilePromo({
  promo,
  onNavigate,
}: {
  promo: SiteNavPanelPromo;
  onNavigate: () => void;
}) {
  const body = (
    <>
      <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        Featured
      </p>
      {promo.imageUrl ? (
        <div className="relative mb-3 aspect-[16/10] overflow-hidden rounded-md bg-muted">
          <Image
            src={promo.imageUrl}
            alt={promo.imageAlt?.trim() || promo.heading || "Featured"}
            fill
            className="object-cover"
            sizes="320px"
          />
        </div>
      ) : null}
      {promo.heading ? (
        <p className="text-sm font-semibold text-foreground">{promo.heading}</p>
      ) : null}
    </>
  );

  if (!promo.href) {
    return (
      <div className="rounded-lg border border-border bg-muted/40 p-3">{body}</div>
    );
  }

  if (promo.external) {
    return (
      <a
        href={promo.href}
        onClick={onNavigate}
        className="block rounded-lg border border-border bg-muted/40 p-3 no-underline"
        target="_blank"
        rel="noopener noreferrer"
      >
        {body}
      </a>
    );
  }

  return (
    <Link
      href={promo.href}
      onClick={onNavigate}
      className="block rounded-lg border border-border bg-muted/40 p-3 no-underline"
    >
      {body}
    </Link>
  );
}

function MobileGroupLinks({
  group,
  onNavigate,
}: {
  group: SiteNavPanelGroup;
  onNavigate: () => void;
}) {
  return (
    <div className="space-y-1">
      <div className="px-1">
        <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          {group.label}
        </p>
        {group.descriptor ? (
          <p className="mt-1 text-[10px] font-normal normal-case tracking-normal text-muted-foreground/80">
            {group.descriptor}
          </p>
        ) : null}
      </div>
      <ul>
        {group.links.map((link) => (
          <li key={`${link.href}-${link.label}`}>
            {link.external ? (
              <a
                href={link.href}
                onClick={onNavigate}
                className="block border-b border-border py-3 text-sm font-semibold text-primary no-underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                {link.label}
              </a>
            ) : (
              <Link
                href={link.href}
                onClick={onNavigate}
                className="block border-b border-border py-3 text-sm font-semibold text-primary no-underline"
              >
                {link.label}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function panelGroups(panel: SiteNavPanel): SiteNavPanelGroup[] {
  return panel.groups.filter((g) => g.links.length > 0);
}

export function SiteNavMobile({items, cta, signIn, request}: SiteNavMobileProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<MobileView>({kind: "root"});

  useEffect(() => {
    setOpen(false);
    setView({kind: "root"});
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        if (view.kind !== "root") {
          setView(
            view.kind === "group"
              ? {kind: "item", itemKey: view.itemKey}
              : {kind: "root"},
          );
          return;
        }
        setOpen(false);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, view]);

  function close() {
    setOpen(false);
    setView({kind: "root"});
  }

  const activeItem =
    view.kind === "item" || view.kind === "group"
      ? items.find((i) => i.key === view.itemKey)
      : undefined;
  const activeGroup =
    view.kind === "group" && activeItem?.panel
      ? panelGroups(activeItem.panel).find((g) => g.key === view.groupKey)
      : undefined;

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
          <PageDielineSection paddingBlock="xs">
            {view.kind !== "root" ? (
              <div className="mb-3 flex items-center justify-between gap-2">
                <button
                  type="button"
                  className="inline-flex items-center gap-1 text-sm font-semibold text-primary"
                  onClick={() =>
                    setView(
                      view.kind === "group"
                        ? {kind: "item", itemKey: view.itemKey}
                        : {kind: "root"},
                    )
                  }
                >
                  <ChevronLeft className="size-4" aria-hidden />
                  Back
                </button>
                <p className="text-sm font-semibold text-foreground">
                  {view.kind === "group"
                    ? activeGroup?.label
                    : activeItem?.label}
                </p>
                <button
                  type="button"
                  className="text-sm text-muted-foreground"
                  onClick={close}
                  aria-label="Close menu"
                >
                  Close
                </button>
              </div>
            ) : null}

            <nav className="mb-4 space-y-1" aria-label="Mobile navigation">
              {view.kind === "root"
                ? items.map((item) => {
                    if (siteNavItemHasPanel(item)) {
                      return (
                        <button
                          key={item.key}
                          type="button"
                          onClick={() =>
                            setView({kind: "item", itemKey: item.key})
                          }
                          className="flex w-full items-center justify-between border-b border-border py-3 text-left text-sm font-semibold text-foreground"
                        >
                          {item.label}
                          <ChevronRight
                            className="size-4 text-muted-foreground"
                            aria-hidden
                          />
                        </button>
                      );
                    }

                    if (item.href) {
                      const isActive = isSiteNavHrefActive(pathname, item.href);
                      return (
                        <Link
                          key={item.key}
                          href={item.href}
                          onClick={close}
                          aria-current={isActive ? "page" : undefined}
                          className={cn(
                            "block border-b border-border py-3 text-sm font-semibold no-underline transition-colors hover:text-primary",
                            isActive ? "text-primary" : "text-foreground",
                          )}
                        >
                          {item.label}
                        </Link>
                      );
                    }

                    return (
                      <span
                        key={item.key}
                        className="block border-b border-border py-3 text-sm font-semibold text-foreground"
                        aria-disabled="true"
                      >
                        {item.label}
                      </span>
                    );
                  })
                : null}

              {view.kind === "item" && activeItem?.panel
                ? (() => {
                    const groups = panelGroups(activeItem.panel);
                    const drillGroups = groups.length >= 3;
                    const promo = siteNavPromoIsVisible(activeItem.panel.promo)
                      ? activeItem.panel.promo!
                      : null;

                    if (!drillGroups) {
                      return (
                        <div className="space-y-6">
                          {groups.map((group) => (
                            <MobileGroupLinks
                              key={group.key}
                              group={group}
                              onNavigate={close}
                            />
                          ))}
                          {promo ? (
                            <MobilePromo promo={promo} onNavigate={close} />
                          ) : null}
                        </div>
                      );
                    }

                    return (
                      <div className="space-y-1">
                        {groups.map((group) => (
                          <button
                            key={group.key}
                            type="button"
                            onClick={() =>
                              setView({
                                kind: "group",
                                itemKey: activeItem.key,
                                groupKey: group.key,
                              })
                            }
                            className="flex w-full items-center justify-between border-b border-border py-3 text-left"
                          >
                            <span>
                              <span className="block text-sm font-semibold text-foreground">
                                {group.label}
                              </span>
                              {group.descriptor ? (
                                <span className="text-xs text-muted-foreground">
                                  {group.descriptor}
                                </span>
                              ) : null}
                            </span>
                            <ChevronRight
                              className="size-4 shrink-0 text-muted-foreground"
                              aria-hidden
                            />
                          </button>
                        ))}
                        {promo ? (
                          <div className="pt-4">
                            <MobilePromo promo={promo} onNavigate={close} />
                          </div>
                        ) : null}
                      </div>
                    );
                  })()
                : null}

              {view.kind === "group" && activeGroup ? (
                <MobileGroupLinks group={activeGroup} onNavigate={close} />
              ) : null}
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
                <Button variant="outline" className="w-full font-semibold" asChild>
                  <Link href={signIn.href} onClick={close}>
                    {signIn.label}
                  </Link>
                </Button>
              ) : null}
              <Button size="lg" className="w-full font-semibold" asChild>
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
