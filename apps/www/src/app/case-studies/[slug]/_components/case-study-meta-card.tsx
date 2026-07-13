"use client";

import { useState } from "react";
import Image from "next/image";
import type { CaseStudyTaxonomyItem } from "@pakfactory/sanity/queries";

function MetaDivider() {
  return (
    <div
      aria-hidden="true"
      className="mx-6 h-px"
      style={{
        width: "calc(100% - 3rem)",
        backgroundImage:
          "linear-gradient(to right, var(--border) 0 6px, transparent 6px 12px)",
        backgroundSize: "12px 1px",
        backgroundRepeat: "repeat-x",
      }}
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
  clientLogoUrl?: string | null;
  clientName?: string | null;
  clientWebsite?: string | null;
  solutions?: CaseStudyTaxonomyItem[] | null;
  products?: CaseStudyTaxonomyItem[] | null;
  expertiseAreas?: CaseStudyTaxonomyItem[] | null;
  capabilities?: CaseStudyTaxonomyItem[] | null;
};

export function CaseStudyMetaCard({
  clientLogoUrl,
  clientName,
  clientWebsite,
  solutions,
  products,
  expertiseAreas,
  capabilities,
}: Props) {
  const sections = [
    { label: "Solution", items: solutions ?? [] },
    { label: "Product", items: products ?? [] },
    { label: "Expertise", items: expertiseAreas ?? [] },
    { label: "Capabilities", items: capabilities ?? [] },
  ].filter((s) => s.items.length > 0);

  const hasClient = clientLogoUrl || clientName;

  return (
    <aside className="relative flex w-full shrink-0 flex-col items-center gap-6 rounded-[14px] py-6 text-border lg:w-[304px]">
      {/* Dashed SVG border that follows the corner curve */}
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
          strokeDasharray="6 6"
        />
      </svg>

      {hasClient && (
        <div className="flex w-full items-center justify-center px-6 text-foreground">
          {clientWebsite ? (
            <a
              href={clientWebsite}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Visit ${clientName ?? "client"} website`}
              className="transition-opacity hover:opacity-75"
            >
              {clientLogoUrl ? (
                <Image
                  src={clientLogoUrl}
                  alt={clientName ?? "Client logo"}
                  width={176}
                  height={73}
                  className="h-[73px] w-auto max-w-[176px] object-contain"
                />
              ) : (
                <p className="text-center text-lg font-semibold text-foreground underline underline-offset-4">
                  {clientName}
                </p>
              )}
            </a>
          ) : clientLogoUrl ? (
            <Image
              src={clientLogoUrl}
              alt={clientName ?? "Client logo"}
              width={176}
              height={73}
              className="h-[73px] w-auto max-w-[176px] object-contain"
            />
          ) : (
            <p className="text-center text-lg font-semibold text-foreground">
              {clientName}
            </p>
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
