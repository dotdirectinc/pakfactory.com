"use client";

import { useState } from "react";
import Image from "next/image";
import type {
  CaseStudyClientDetail,
  CaseStudyTaxonomyItem,
} from "@pakfactory/sanity/queries";

function MetaDivider() {
  return (
    <div
      aria-hidden="true"
      className="mx-6 h-px w-[calc(100%-3rem)] bg-border"
    />
  );
}

function MetaBlock({
  label,
  items,
  maxVisible = 3,
}: {
  label: string;
  items: CaseStudyTaxonomyItem[];
  maxVisible?: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const overflowing = items.length > maxVisible;
  const visible = expanded || !overflowing ? items : items.slice(0, maxVisible);
  const hidden = items.length - visible.length;

  return (
    <div className="flex w-full flex-col gap-2.5 px-6">
      <p className="text-sm font-semibold text-card-foreground">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {visible.map((item) => (
          <span
            key={item._id}
            className="inline-flex items-center rounded-full border border-border bg-background px-2.5 py-1 text-xs leading-4 text-muted-foreground"
          >
            {item.title}
          </span>
        ))}
        {overflowing && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            className="inline-flex items-center rounded-full border border-dashed border-border bg-transparent px-2.5 py-1 text-xs font-medium leading-4 text-foreground transition-colors hover:bg-muted/40"
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
    { label: "Solution", items: solutionItems },
    { label: "Product", items: products ?? [] },
    { label: "Expertise", items: expertiseAreas ?? [] },
    { label: "Customization", items: customizations ?? [] },
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
    <aside className="relative flex w-full shrink-0 flex-col items-center gap-6 rounded-[14px] py-6 text-border lg:w-[304px]">
      {/* Solid SVG border that follows the corner curve */}
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
        fill="none"
      >
        <rect
          width="100%"
          height="100%"
          rx="14"
          ry="14"
          stroke="currentColor"
          strokeWidth="1"
        />
      </svg>

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
          <MetaBlock label={section.label} items={section.items} />
        </div>
      ))}
    </aside>
  );
}
