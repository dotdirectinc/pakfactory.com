"use client";

import { useState, type ComponentType, type SVGProps } from "react";
import Image from "next/image";
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
function MetaDivider() {
  return (
    <div
      aria-hidden="true"
      className="mx-6 h-px w-[calc(100%-3rem)] bg-border"
    />
  );
}

type MetaIcon = ComponentType<
  SVGProps<SVGSVGElement> & { size?: number | string; className?: string }
>;

function MetaBlock({
  label,
  Icon,
  items,
  maxVisible = 3,
}: {
  label: string;
  Icon: MetaIcon;
  items: CaseStudyTaxonomyItem[];
  maxVisible?: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const overflowing = items.length > maxVisible;
  const visible = expanded || !overflowing ? items : items.slice(0, maxVisible);
  const hidden = items.length - visible.length;

  return (
    <div className="flex w-full flex-col gap-2.5 px-6">
      <div className="flex items-center gap-2.5">
        <Icon size={18} className="shrink-0" />
        <p className="text-sm font-semibold text-muted-foreground">{label}</p>
      </div>
      <div className="flex flex-wrap gap-2.5">
        {visible.map((item) => (
          <span
            key={item._id}
            className="inline-flex h-[23px] items-center justify-center rounded-full border-[0.5px] border-[#cecece] px-4 text-xs font-normal leading-4 text-muted-foreground"
          >
            {item.title}
          </span>
        ))}
        {overflowing && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            className="inline-flex h-[23px] cursor-pointer items-center justify-center rounded-full border border-dashed border-foreground/10 bg-transparent px-4 text-xs font-medium leading-4 text-[#173807] transition-colors hover:border-primary hover:bg-primary/10 hover:text-primary"
          >
            {expanded ? "Show less" : `+${hidden} more`}
          </button>
        )}
      </div>
    </div>
  );
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
  const solutionItems = client?.industry ? [client.industry] : [];
  const sections = [
    {
      label: "Solution",
      Icon: SolutionIcon,
      items: solutionItems,
    },
    {
      label: "Packaging Type",
      Icon: PackagingTypeIcon,
      items: products ?? [],
    },
    {
      label: "Expertise",
      Icon: ExpertiseIcon,
      items: expertiseAreas ?? [],
    },
    {
      label: "Customization",
      Icon: CustomizationIcon,
      items: customizations ?? [],
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
    <p className="text-center text-lg font-semibold text-foreground">{client?.name}</p>
  );

  return (
    <aside className="relative flex w-full shrink-0 flex-col items-center gap-6 rounded-[14px] border border-border bg-brand-cream py-6 text-border lg:w-[304px]">
      {hasClient && (
        <div className="flex w-full items-center justify-center px-6 text-foreground">
          {client?.website ? (
            <a
              href={client.website}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={
                client.name ? `Visit ${client.name} website` : "Visit client website"
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
