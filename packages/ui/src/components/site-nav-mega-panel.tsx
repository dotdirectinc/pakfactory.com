"use client";

import Link from "next/link";
import Image from "next/image";
import {
  siteNavPromoIsVisible,
  type SiteNavPanel,
  type SiteNavPanelGroup,
  type SiteNavPanelLink,
  type SiteNavPanelPromo,
} from "@pakfactory/ui/components/site-nav";
import {cn} from "@pakfactory/ui/lib/utils";

function GroupHeading({
  label,
  descriptor,
}: {
  label: string;
  descriptor?: string;
}) {
  return (
    <div className="mb-2">
      <p className="text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
        {label}
      </p>
      {descriptor ? (
        <p className="mt-1 text-[10px] font-normal normal-case tracking-normal text-muted-foreground/80">
          {descriptor}
        </p>
      ) : null}
    </div>
  );
}

function PanelLink({
  label,
  href,
  external,
  onNavigate,
}: {
  label: string;
  href: string;
  external?: boolean;
  onNavigate?: () => void;
}) {
  const className =
    "block py-1 text-base font-semibold text-foreground no-underline transition-colors hover:text-primary";
  if (external) {
    return (
      <a
        href={href}
        className={className}
        target="_blank"
        rel="noopener noreferrer"
        onClick={onNavigate}
      >
        {label}
      </a>
    );
  }
  return (
    <Link href={href} className={className} onClick={onNavigate}>
      {label}
    </Link>
  );
}

/** Always two columns so cols 1–2 of the mega grid stay occupied. */
function SplitLinkColumns({
  links,
  onNavigate,
}: {
  links: SiteNavPanelGroup["links"];
  onNavigate?: () => void;
}) {
  if (links.length === 0) return null;
  if (links.length === 1) {
    const only = links[0]!;
    return (
      <div className="grid grid-cols-2 gap-x-6">
        <ul className="flex flex-col gap-0.5">
          <li key={`${only.href}-${only.label}`}>
            <PanelLink {...only} onNavigate={onNavigate} />
          </li>
        </ul>
        <div aria-hidden />
      </div>
    );
  }
  const mid = Math.ceil(links.length / 2);
  const left = links.slice(0, mid);
  const right = links.slice(mid);
  return (
    <div className="grid grid-cols-2 gap-x-6">
      <ul className="flex flex-col gap-0.5">
        {left.map((link) => (
          <li key={`${link.href}-${link.label}`}>
            <PanelLink {...link} onNavigate={onNavigate} />
          </li>
        ))}
      </ul>
      <ul className="flex flex-col gap-0.5">
        {right.map((link) => (
          <li key={`${link.href}-${link.label}`}>
            <PanelLink {...link} onNavigate={onNavigate} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function FeaturedPromo({
  promo,
  onNavigate,
}: {
  promo: SiteNavPanelPromo;
  onNavigate?: () => void;
}) {
  const heading = promo.heading?.trim();
  const body = (
    <>
      <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        Featured
      </p>
      {promo.imageUrl ? (
        <div className="relative mb-3 aspect-[16/10] overflow-hidden rounded-md bg-muted">
          <Image
            src={promo.imageUrl}
            alt={promo.imageAlt?.trim() || heading || "Featured"}
            fill
            className="object-cover"
            sizes="200px"
          />
        </div>
      ) : null}
      {heading ? (
        <p className="mb-1 text-sm font-semibold text-foreground">{heading}</p>
      ) : null}
      {promo.href ? (
        <span className="text-sm font-medium text-primary">Learn more →</span>
      ) : null}
    </>
  );

  const shellClass =
    "block no-underline transition-colors hover:opacity-90";

  if (promo.href) {
    if (promo.external) {
      return (
        <a
          href={promo.href}
          className={shellClass}
          target="_blank"
          rel="noopener noreferrer"
          onClick={onNavigate}
        >
          {body}
        </a>
      );
    }
    return (
      <Link href={promo.href} className={shellClass} onClick={onNavigate}>
        {body}
      </Link>
    );
  }

  return <div className={shellClass}>{body}</div>;
}

function FooterCtaLink({
  cta,
  onNavigate,
}: {
  cta: SiteNavPanelLink;
  onNavigate?: () => void;
}) {
  const className =
    "text-sm font-medium text-primary no-underline transition-colors hover:text-primary/80";
  if (cta.external) {
    return (
      <a
        href={cta.href}
        className={className}
        target="_blank"
        rel="noopener noreferrer"
        onClick={onNavigate}
      >
        {cta.label}
      </a>
    );
  }
  return (
    <Link href={cta.href} className={className} onClick={onNavigate}>
      {cta.label}
    </Link>
  );
}

/**
 * Persistent 4-column mega body: cols 1–2 primary (no divider), col 3 secondary,
 * col 4 promo rail; optional footer CTA row.
 */
export function SiteNavMegaPanel({
  panel,
  onNavigate,
  className,
}: {
  panel: SiteNavPanel;
  onNavigate?: () => void;
  className?: string;
}) {
  const groups = panel.groups.filter((g) => g.links.length > 0);
  const promo = siteNavPromoIsVisible(panel.promo) ? panel.promo! : null;
  const footerCta = panel.footerCta?.href?.trim()
    ? panel.footerCta
    : null;

  const primary = groups[0] ?? null;
  const secondary = groups.slice(1);

  return (
    <div className={cn("flex w-full flex-col text-left", className)}>
      <div className="grid w-full grid-cols-4 items-stretch gap-0">
        <div className="col-span-2 min-w-0 py-5 pr-6 pl-layout-gutter-inner">
          {primary ? (
            <>
              <GroupHeading
                label={primary.label}
                descriptor={primary.descriptor}
              />
              <SplitLinkColumns
                links={primary.links}
                onNavigate={onNavigate}
              />
            </>
          ) : null}
        </div>

        <div className="flex min-h-full min-w-0 flex-col self-stretch border-l border-dashed border-border px-6 py-5">
          <div className="flex flex-col gap-5">
            {secondary.map((group) => (
              <div key={group.key}>
                <GroupHeading
                  label={group.label}
                  descriptor={group.descriptor}
                />
                <ul className="flex flex-col gap-0.5">
                  {group.links.map((link) => (
                    <li key={`${link.href}-${link.label}`}>
                      <PanelLink {...link} onNavigate={onNavigate} />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="flex min-h-full min-w-0 flex-col self-stretch border-l border-dashed border-border bg-muted/40">
          <div className="p-6">
            {promo ? (
              <FeaturedPromo promo={promo} onNavigate={onNavigate} />
            ) : null}
          </div>
        </div>
      </div>

      {footerCta ? (
        <div className="w-full border-t border-dashed border-border">
          <div className="py-4 pl-layout-gutter-inner">
            <FooterCtaLink cta={footerCta} onNavigate={onNavigate} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
