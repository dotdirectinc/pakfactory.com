"use client";

import { useState, type ReactNode } from "react";
import { ExternalLink } from "lucide-react";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@pakfactory/ui/components/hover-card";
import { cn } from "@pakfactory/ui/lib/utils";
import type { PreviewResult } from "@/app/(admin)/spec/mapping/preview-actions";
import { ADMIN_SPEC_MAPPING_COPY as COPY } from "@/lib/copy/spec-mapping";

/**
 * A spec record on the Mapping review (PLAT-52): a link that opens its detail page in a new tab, and
 * on hover a card with what the record is. The card's details load the first time it opens.
 */
export function SpecHoverLink({
  href,
  load,
  side,
  className,
  children,
}: {
  href: string | null;
  load: () => Promise<PreviewResult>;
  side: "website" | "production";
  className?: string;
  children: ReactNode;
}) {
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [loading, setLoading] = useState(false);

  function open(isOpen: boolean) {
    if (!isOpen || preview || loading) return;
    setLoading(true);
    load()
      .then(setPreview)
      .catch(() => setPreview({ ok: false, error: COPY.previewFailed }))
      .finally(() => setLoading(false));
  }

  const body = href ? (
    <a href={href} target="_blank" rel="noopener noreferrer" className={cn("group inline-flex items-baseline gap-1 underline-offset-4 hover:underline", className)}>
      {children}
      <ExternalLink className="size-3 shrink-0 self-center text-muted-foreground opacity-60 group-hover:opacity-100" aria-label={COPY.opensInNewTab} />
    </a>
  ) : (
    <span className={className}>{children}</span>
  );

  return (
    <HoverCard openDelay={250} closeDelay={100} onOpenChange={open}>
      <HoverCardTrigger asChild>{body}</HoverCardTrigger>
      <HoverCardContent className="w-80 text-sm" align="start">
        <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">{side === "website" ? COPY.websiteSide : COPY.productionSide}</p>
        {!preview ? (
          <p className="text-muted-foreground">{COPY.previewLoading}</p>
        ) : !preview.ok ? (
          <p className="text-muted-foreground">{COPY.previewUnavailable(preview.error)}</p>
        ) : (
          <div className="flex flex-col gap-2">
            <div className="flex gap-3">
              {preview.data.image ? <img src={`${preview.data.image}?w=96&h=96&fit=crop`} alt="" className="size-12 shrink-0 rounded border border-border object-cover" /> : null}
              <div className="min-w-0">
                <p className="font-medium">{preview.data.title}</p>
                <p className="text-xs text-muted-foreground">
                  {preview.data.kind}
                  {preview.data.code ? <span className="font-mono"> · {preview.data.code}</span> : null}
                </p>
              </div>
            </div>
            {preview.data.lead ? <p className="text-muted-foreground">{preview.data.lead}</p> : null}
            {preview.data.facts.length > 0 ? (
              <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-xs">
                {preview.data.facts.map(([k, v]) => (
                  <div key={k} className="contents">
                    <dt className="text-muted-foreground">{k}</dt>
                    <dd className="min-w-0 break-words">{v}</dd>
                  </div>
                ))}
              </dl>
            ) : null}
            {href ? <p className="text-xs text-muted-foreground">{COPY.clickToOpen}</p> : <p className="text-xs text-muted-foreground">{COPY.noPage}</p>}
          </div>
        )}
      </HoverCardContent>
    </HoverCard>
  );
}
