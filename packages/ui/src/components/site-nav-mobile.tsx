'use client';

import {useCallback, useEffect, useState, type ReactNode} from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {ChevronRight, Menu, X} from 'lucide-react';
import {usePathname} from 'next/navigation';
import {Button} from '@pakfactory/ui/components/button';
import {PageDielineSection} from '@pakfactory/ui/components/page-dieline-section';
import {
    siteNavItemHasPanel,
    siteNavPromoIsVisible,
    type SiteNavCta,
    type SiteNavItem,
    type SiteNavMobileChrome,
    type SiteNavPanel,
    type SiteNavPanelGroup,
    type SiteNavPanelLink,
    type SiteNavPanelPromo,
} from '@pakfactory/ui/components/site-nav';
import {isSiteNavHrefActive} from '@pakfactory/ui/components/site-nav-links';
import {cn} from '@pakfactory/ui/lib/utils';

const MOBILE_FADE =
    'animate-in fade-in duration-200 ease-[cubic-bezier(0.4,0,0.6,1)] fill-mode-both motion-reduce:animate-none';

type SiteNavMobileProps = {
    items: SiteNavItem[];
    cta: SiteNavCta;
    signIn?: SiteNavCta;
    onChromeChange?: (chrome: SiteNavMobileChrome) => void;
};

type MobileView =
    | {kind: 'root'}
    | {kind: 'item'; itemKey: string}
    | {kind: 'group'; itemKey: string; groupKey: string};

const menuControlClass =
    'inline-flex size-9 shrink-0 items-center justify-center rounded-2xl bg-muted/60 text-foreground transition-colors hover:bg-muted';

function isSolutionsItem(item: SiteNavItem): boolean {
    return item.label.trim().toLowerCase() === 'solutions';
}

/** Dashed rule spans the flush dieline column; content keeps the inner gutter. */
function MobileDashedRow({
    children,
    className,
}: {
    children: ReactNode;
    className?: string;
}) {
    return (
        <div className="border-b border-dashed border-border">
            <div className={cn('px-layout-gutter-inner py-3', className)}>
                {children}
            </div>
        </div>
    );
}

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
                        alt={
                            promo.imageAlt?.trim() ||
                            promo.heading ||
                            'Featured'
                        }
                        fill
                        className="object-cover"
                        sizes="320px"
                    />
                </div>
            ) : null}
            {promo.heading ? (
                <p className="text-sm font-semibold text-foreground">
                    {promo.heading}
                </p>
            ) : null}
        </>
    );

    if (!promo.href) {
        return (
            <div className="rounded-lg border border-border bg-muted/40 p-3">
                {body}
            </div>
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

function MobileFooterCtaCard({
    cta,
    onNavigate,
}: {
    cta: SiteNavPanelLink;
    onNavigate: () => void;
}) {
    const className =
        'block rounded-2xl border border-border bg-background px-5 py-4 no-underline transition-colors hover:bg-muted/40';
    const body = (
        <>
            <p className="text-sm font-semibold text-primary">{cta.label}</p>
            <p className="mt-1 text-xs text-muted-foreground">
                Explore our full product catalogue
            </p>
        </>
    );

    if (cta.external) {
        return (
            <a
                href={cta.href}
                onClick={onNavigate}
                className={className}
                target="_blank"
                rel="noopener noreferrer"
            >
                {body}
            </a>
        );
    }

    return (
        <Link href={cta.href} onClick={onNavigate} className={className}>
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
        <div>
            <div className="px-layout-gutter-inner pb-2 pt-4">
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
                        <MobileDashedRow>
                            {link.external ? (
                                <a
                                    href={link.href}
                                    onClick={onNavigate}
                                    className="block text-sm font-semibold text-primary no-underline"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    {link.label}
                                </a>
                            ) : (
                                <Link
                                    href={link.href}
                                    onClick={onNavigate}
                                    className="block text-sm font-semibold text-primary no-underline"
                                >
                                    {link.label}
                                </Link>
                            )}
                        </MobileDashedRow>
                    </li>
                ))}
            </ul>
        </div>
    );
}

function panelGroups(panel: SiteNavPanel): SiteNavPanelGroup[] {
    return panel.groups.filter((g) => g.links.length > 0);
}

export function SiteNavMobile({
    items,
    cta,
    signIn,
    onChromeChange,
}: SiteNavMobileProps) {
    const pathname = usePathname();
    const [open, setOpen] = useState(false);
    const [view, setView] = useState<MobileView>({kind: 'root'});

    const goBack = useCallback(() => {
        setView((current) => {
            if (current.kind === 'group') {
                return {kind: 'item', itemKey: current.itemKey};
            }
            return {kind: 'root'};
        });
    }, []);

    useEffect(() => {
        setOpen(false);
        setView({kind: 'root'});
    }, [pathname]);

    useEffect(() => {
        if (!open) return;
        const previous = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = previous;
        };
    }, [open]);

    useEffect(() => {
        if (!open) return;
        function onKey(event: KeyboardEvent) {
            if (event.key === 'Escape') {
                if (view.kind !== 'root') {
                    goBack();
                    return;
                }
                setOpen(false);
            }
        }
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [open, view, goBack]);

    function close() {
        setOpen(false);
        setView({kind: 'root'});
    }

    const activeItem =
        view.kind === 'item' || view.kind === 'group'
            ? items.find((i) => i.key === view.itemKey)
            : undefined;
    const activeGroup =
        view.kind === 'group' && activeItem?.panel
            ? panelGroups(activeItem.panel).find((g) => g.key === view.groupKey)
            : undefined;

    const nestedTitle =
        view.kind === 'group'
            ? (activeGroup?.label ?? null)
            : view.kind === 'item'
              ? (activeItem?.label ?? null)
              : null;

    useEffect(() => {
        if (!onChromeChange) return;
        const nested = open && view.kind !== 'root';
        onChromeChange({
            nested,
            title: nested ? nestedTitle : null,
            onBack: nested ? goBack : null,
        });
    }, [open, view, nestedTitle, goBack, onChromeChange]);

    useEffect(() => {
        return () => {
            onChromeChange?.({nested: false, title: null, onBack: null});
        };
    }, [onChromeChange]);

    const rootFooterCtas = items
        .filter((item) => !isSolutionsItem(item))
        .filter((item) => item.panel?.footerCta?.href?.trim())
        .map((item) => item.panel!.footerCta!);
    const activeFooterCta =
        activeItem &&
        !isSolutionsItem(activeItem) &&
        activeItem.panel?.footerCta?.href?.trim()
            ? activeItem.panel.footerCta
            : null;

    const viewKey =
        view.kind === 'root'
            ? 'root'
            : view.kind === 'item'
              ? `item-${view.itemKey}`
              : `group-${view.itemKey}-${view.groupKey}`;

    return (
        <>
            <button
                type="button"
                onClick={() => (open ? close() : setOpen(true))}
                className={cn(menuControlClass, 'relative z-[60] md:hidden')}
                aria-label={open ? 'Close menu' : 'Open menu'}
                aria-expanded={open}
            >
                {open ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>

            {open ? (
                <div
                    className={cn(
                        // Sit under the site header so logo + control stay put (Stripe continuity).
                        'fixed inset-x-0 bottom-0 top-[var(--site-nav-offset,4.5rem)] z-50 flex flex-col bg-background md:hidden',
                        MOBILE_FADE,
                    )}
                    role="dialog"
                    aria-modal="true"
                    aria-label="Site navigation"
                >
                    <PageDielineSection
                        flush
                        paddingBlock="none"
                        className="flex min-h-0 flex-1 flex-col"
                        innerClassName="flex min-h-0 flex-1 flex-col"
                    >
                        <div className="min-h-0 flex-1 overflow-y-auto">
                            <div key={viewKey} className={MOBILE_FADE}>
                                {view.kind !== 'root' && nestedTitle ? (
                                    <p className="mb-2 px-layout-gutter-inner pt-4 text-sm font-semibold text-foreground">
                                        {nestedTitle}
                                    </p>
                                ) : null}

                                <nav aria-label="Mobile navigation">
                                    {view.kind === 'root'
                                        ? items.map((item) => {
                                              if (siteNavItemHasPanel(item)) {
                                                  return (
                                                      <MobileDashedRow
                                                          key={item.key}
                                                      >
                                                          <button
                                                              type="button"
                                                              onClick={() =>
                                                                  setView({
                                                                      kind: 'item',
                                                                      itemKey:
                                                                          item.key,
                                                                  })
                                                              }
                                                              className="flex w-full items-center justify-between text-left text-base font-semibold text-foreground"
                                                          >
                                                              {item.label}
                                                              <ChevronRight
                                                                  className="size-4 text-muted-foreground"
                                                                  aria-hidden
                                                              />
                                                          </button>
                                                      </MobileDashedRow>
                                                  );
                                              }

                                              if (item.href) {
                                                  const isActive =
                                                      isSiteNavHrefActive(
                                                          pathname,
                                                          item.href,
                                                      );
                                                  return (
                                                      <MobileDashedRow
                                                          key={item.key}
                                                      >
                                                          <Link
                                                              href={item.href}
                                                              onClick={close}
                                                              aria-current={
                                                                  isActive
                                                                      ? 'page'
                                                                      : undefined
                                                              }
                                                              className={cn(
                                                                  'block text-base font-semibold no-underline transition-colors hover:text-primary',
                                                                  isActive
                                                                      ? 'text-primary'
                                                                      : 'text-foreground',
                                                              )}
                                                          >
                                                              {item.label}
                                                          </Link>
                                                      </MobileDashedRow>
                                                  );
                                              }

                                              return (
                                                  <MobileDashedRow
                                                      key={item.key}
                                                  >
                                                      <span
                                                          className="block text-base font-semibold text-foreground"
                                                          aria-disabled="true"
                                                      >
                                                          {item.label}
                                                      </span>
                                                  </MobileDashedRow>
                                              );
                                          })
                                        : null}

                                    {view.kind === 'item' && activeItem?.panel
                                        ? (() => {
                                              const groups = panelGroups(
                                                  activeItem.panel,
                                              );
                                              const drillGroups =
                                                  groups.length >= 3;
                                              const promo =
                                                  siteNavPromoIsVisible(
                                                      activeItem.panel.promo,
                                                  )
                                                      ? activeItem.panel.promo!
                                                      : null;

                                              if (!drillGroups) {
                                                  return (
                                                      <div className="space-y-2">
                                                          {groups.map(
                                                              (group) => (
                                                                  <MobileGroupLinks
                                                                      key={
                                                                          group.key
                                                                      }
                                                                      group={
                                                                          group
                                                                      }
                                                                      onNavigate={
                                                                          close
                                                                      }
                                                                  />
                                                              ),
                                                          )}
                                                          {promo ? (
                                                              <div className="px-layout-gutter-inner pt-4">
                                                                  <MobilePromo
                                                                      promo={
                                                                          promo
                                                                      }
                                                                      onNavigate={
                                                                          close
                                                                      }
                                                                  />
                                                              </div>
                                                          ) : null}
                                                      </div>
                                                  );
                                              }

                                              return (
                                                  <div>
                                                      {groups.map((group) => (
                                                          <MobileDashedRow
                                                              key={group.key}
                                                          >
                                                              <button
                                                                  type="button"
                                                                  onClick={() =>
                                                                      setView({
                                                                          kind: 'group',
                                                                          itemKey:
                                                                              activeItem.key,
                                                                          groupKey:
                                                                              group.key,
                                                                      })
                                                                  }
                                                                  className="flex w-full items-center justify-between text-left"
                                                              >
                                                                  <span>
                                                                      <span className="block text-base font-semibold text-foreground">
                                                                          {
                                                                              group.label
                                                                          }
                                                                      </span>
                                                                      {group.descriptor ? (
                                                                          <span className="text-xs text-muted-foreground">
                                                                              {
                                                                                  group.descriptor
                                                                              }
                                                                          </span>
                                                                      ) : null}
                                                                  </span>
                                                                  <ChevronRight
                                                                      className="size-4 shrink-0 text-muted-foreground"
                                                                      aria-hidden
                                                                  />
                                                              </button>
                                                          </MobileDashedRow>
                                                      ))}
                                                      {promo ? (
                                                          <div className="px-layout-gutter-inner pt-4">
                                                              <MobilePromo
                                                                  promo={promo}
                                                                  onNavigate={
                                                                      close
                                                                  }
                                                              />
                                                          </div>
                                                      ) : null}
                                                  </div>
                                              );
                                          })()
                                        : null}

                                    {view.kind === 'group' && activeGroup ? (
                                        <MobileGroupLinks
                                            group={activeGroup}
                                            onNavigate={close}
                                        />
                                    ) : null}
                                </nav>

                                {view.kind === 'root' &&
                                rootFooterCtas.length > 0 ? (
                                    <div className="mt-6 flex flex-col gap-2 px-layout-gutter-inner">
                                        {rootFooterCtas.map((footerCta) => (
                                            <MobileFooterCtaCard
                                                key={`${footerCta.href}-${footerCta.label}`}
                                                cta={footerCta}
                                                onNavigate={close}
                                            />
                                        ))}
                                    </div>
                                ) : null}

                                {view.kind === 'item' && activeFooterCta ? (
                                    <div className="mt-6 px-layout-gutter-inner">
                                        <MobileFooterCtaCard
                                            cta={activeFooterCta}
                                            onNavigate={close}
                                        />
                                    </div>
                                ) : null}
                            </div>
                        </div>

                        <div className="shrink-0 border-t border-dashed border-border px-layout-gutter-inner py-4">
                            <div
                                className={cn(
                                    'grid gap-2',
                                    signIn ? 'grid-cols-2' : 'grid-cols-1',
                                )}
                            >
                                {signIn ? (
                                    <Button
                                        variant="outline"
                                        className="w-full font-semibold"
                                        asChild
                                    >
                                        <Link
                                            href={signIn.href}
                                            onClick={close}
                                        >
                                            {signIn.label}
                                        </Link>
                                    </Button>
                                ) : null}
                                <Button
                                    size="lg"
                                    className="w-full font-semibold"
                                    asChild
                                >
                                    <Link href={cta.href} onClick={close}>
                                        {cta.label}
                                    </Link>
                                </Button>
                            </div>
                        </div>
                    </PageDielineSection>
                </div>
            ) : null}
        </>
    );
}
