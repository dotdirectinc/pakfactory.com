"use client";

import {useState, type ComponentType, type SVGProps} from "react";
import Image from "next/image";
import Link from "next/link";
import type {
  CaseStudyClientDetail,
  CaseStudyTaxonomyItem,
} from "@pakfactory/sanity/queries";
import {
  CustomizationIcon,
  ExpertiseIcon,
  PackagingTypeIcon,
  SolutionIcon,
} from "@pakfactory/ui/icons/case-study-meta-icons";
import {SneakPeek} from "@pakfactory/ui/components/sneak-peek";
import {WWW_ROUTES} from "@/lib/www-routes";
import {cn} from "@pakfactory/ui/lib/utils";

function MetaDivider() {
  return (
    <div
      aria-hidden="true"
      className="mx-6 h-px w-[calc(100%-3rem)] bg-border"
    />
  );
}

type MetaIcon = ComponentType<
  SVGProps<SVGSVGElement> & {size?: number | string; className?: string}
>;

type MetaChipItem = {
  id: string;
  title: string;
  href?: string;
  excerpt?: string | null;
  imageUrl?: string | null;
};

const chipClassName =
  "inline-flex min-h-6 max-w-full items-center justify-center break-words rounded-md border border-border bg-card px-4 py-1 text-left text-xs font-normal leading-4 text-muted-foreground transition-colors";

const chipLinkClassName = cn(
  chipClassName,
  "hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
);

function MetaChip({item}: {item: MetaChipItem}) {
  const label = item.title;
  const peekable = Boolean(item.excerpt?.trim() || item.imageUrl?.trim());

  if (!item.href) {
    return <span className={chipClassName}>{label}</span>;
  }

  const link = (
    <Link href={item.href} className={chipLinkClassName}>
      {label}
    </Link>
  );

  if (!peekable) return link;

  return (
    <SneakPeek
      title={item.title}
      excerpt={item.excerpt}
      imageUrl={item.imageUrl}
      href={item.href}
    >
      {link}
    </SneakPeek>
  );
}

function MetaBlock({
  label,
  Icon,
  items,
  maxVisible = 3,
}: {
  label: string;
  Icon: MetaIcon;
  items: MetaChipItem[];
  maxVisible?: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const overflowing = items.length > maxVisible;
  const visible = expanded || !overflowing ? items : items.slice(0, maxVisible);
  const hidden = items.length - visible.length;

  return (
    <div className="flex w-full flex-col gap-2 px-6">
      <div className="flex items-center gap-2">
        <Icon size={18} className="shrink-0" />
        <p className="text-sm font-semibold text-muted-foreground">{label}</p>
      </div>
      <div className="flex flex-wrap items-start gap-2">
        {visible.map((item) => (
          <MetaChip key={item.id} item={item} />
        ))}
        {overflowing && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            className="inline-flex min-h-6 cursor-pointer items-center justify-center rounded-md border border-dashed border-foreground/10 bg-transparent px-4 py-1 text-xs font-medium leading-4 text-brand-forest transition-colors hover:border-primary hover:bg-primary/10 hover:text-primary"
          >
            {expanded ? "Show less" : `+${hidden} more`}
          </button>
        )}
      </div>
    </div>
  );
}

function hrefForProductLine(item: CaseStudyTaxonomyItem): string | undefined {
  const slug = item.slug?.trim();
  return slug ? `${WWW_ROUTES.products}/${slug}` : undefined;
}

function hrefForExpertise(item: CaseStudyTaxonomyItem): string | undefined {
  const slug = item.slug?.trim();
  return slug ? `${WWW_ROUTES.expertise}/${slug}` : undefined;
}

function hrefForSolution(item: CaseStudyTaxonomyItem): string | undefined {
  const slug = item.slug?.trim();
  return slug ? `${WWW_ROUTES.solutions}/${slug}` : undefined;
}

function hrefForCustomization(item: CaseStudyTaxonomyItem): string | undefined {
  const slug = item.slug?.trim();
  const categorySlug = item.categorySlug?.trim();
  if (!slug || !categorySlug) return undefined;
  return `${WWW_ROUTES.customizations}/${categorySlug}/${slug}`;
}

function toChipItem(
  item: CaseStudyTaxonomyItem,
  hrefFor: (item: CaseStudyTaxonomyItem) => string | undefined,
): MetaChipItem {
  return {
    id: item._id,
    title: item.title,
    // A Not active line, solution or option keeps its chip as a label — no 404 link.
    href: item.linkable === false ? undefined : hrefFor(item),
    excerpt: item.excerpt,
    imageUrl: item.imageUrl,
  };
}

type Props = {
  client?: CaseStudyClientDetail | null;
  products?: CaseStudyTaxonomyItem[] | null;
  expertiseAreas?: CaseStudyTaxonomyItem[] | null;
  customizations?: CaseStudyTaxonomyItem[] | null;
};

export function CaseStudyMetaCard({
  client,
  products,
  expertiseAreas,
  customizations,
}: Props) {
  const solutionItems = client?.industry
    ? [toChipItem(client.industry, hrefForSolution)]
    : [];
  const sections = [
    {
      label: "Solution",
      Icon: SolutionIcon,
      items: solutionItems,
    },
    {
      label: "Packaging Type",
      Icon: PackagingTypeIcon,
      items: (products ?? []).map((item) =>
        toChipItem(item, hrefForProductLine),
      ),
    },
    {
      label: "Expertise",
      Icon: ExpertiseIcon,
      items: (expertiseAreas ?? []).map((item) =>
        toChipItem(item, hrefForExpertise),
      ),
    },
    {
      label: "Customization",
      Icon: CustomizationIcon,
      items: (customizations ?? []).map((item) =>
        toChipItem(item, hrefForCustomization),
      ),
    },
  ].filter((s) => s.items.length > 0);

  const hasClient = Boolean(client?.logoUrl || client?.name);

  const clientMark = client?.logoUrl ? (
    <Image
      src={client.logoUrl}
      alt={client.name ?? "Client logo"}
      width={176}
      height={73}
      className="h-[73px] w-auto max-w-[176px] object-contain"
    />
  ) : (
    <p className="text-center text-lg font-semibold text-foreground">
      {client?.name}
    </p>
  );

  return (
    <aside className="relative flex w-full shrink-0 flex-col items-center gap-6 rounded-[14px] border border-border bg-brand-highlight py-6 text-border lg:w-[304px]">
      {hasClient && (
        <div className="flex w-full items-center justify-center px-6 text-foreground">
          {client?.website ? (
            <a
              href={client.website}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={
                client.name
                  ? `Visit ${client.name} website`
                  : "Visit client website"
              }
              className="inline-flex transition-opacity hover:opacity-80"
            >
              {clientMark}
            </a>
          ) : (
            clientMark
          )}
        </div>
      )}

      {sections.map((section, i) => (
        <div key={section.label} className="contents">
          {(hasClient || i > 0) && <MetaDivider />}
          <MetaBlock
            label={section.label}
            Icon={section.Icon}
            items={section.items}
          />
        </div>
      ))}
    </aside>
  );
}
