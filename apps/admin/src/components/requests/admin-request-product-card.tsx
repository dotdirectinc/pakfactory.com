"use client";

import { Plus } from "lucide-react";
import { toast } from "sonner";
import type { RequestLine } from "@pakfactory/domain/request";
import { Button } from "@pakfactory/ui/components/button";
import { cn } from "@pakfactory/ui/lib/utils";
import { ComingSoonButton } from "@/components/requests/coming-soon-button";
import { ADMIN_REQUESTS_COPY } from "@/lib/copy/requests";

type AdminRequestProductCardProps = {
  line: RequestLine;
};

function humanizeSlug(slug: string): string {
  return slug.replace(/-/g, " ").trim();
}

function formatQuantityUnits(quantities: number[]): string {
  if (quantities.length === 0) return "";
  return (
    quantities.map((n) => n.toLocaleString("en-US")).join(", ") +
    ` ${ADMIN_REQUESTS_COPY.unitsSuffix}`
  );
}

/**
 * Read-only brief-builder card chrome for admin request detail.
 * Action links toast Coming Soon until edit is enabled.
 */
export function AdminRequestProductCard({ line }: AdminRequestProductCardProps) {
  const title = humanizeSlug(line.productSlug) || line.productSlug;
  const qtyUnits = formatQuantityUnits(line.quantities);
  const thumbSrc = line.referenceImages?.[0]?.url ?? null;

  const specRows: { key: string; label: string; value: string }[] = [];
  if (line.contents.trim()) {
    specRows.push({
      key: "contents",
      label: ADMIN_REQUESTS_COPY.contentsLabel,
      value: line.contents.trim(),
    });
  }
  if (line.customizations.length > 0) {
    specRows.push({
      key: "customizations",
      label: ADMIN_REQUESTS_COPY.customizationsLabel,
      value: line.customizations.map((c) => c.label).join(" · "),
    });
  }
  if (line.notes?.trim()) {
    specRows.push({
      key: "notes",
      label: ADMIN_REQUESTS_COPY.notesLabel,
      value: line.notes.trim(),
    });
  }

  return (
    <div className="flex min-w-0 flex-col overflow-hidden rounded-xl border border-border bg-background sm:flex-row sm:items-stretch">
      <div className="mx-auto aspect-square w-[115px] max-h-[115px] shrink-0 self-start bg-background p-4 sm:mx-0">
        <div className="size-full overflow-hidden rounded-md bg-muted">
          {thumbSrc ? (
            // Reference image URLs come from the request payload / attachment resolve.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={thumbSrc}
              alt=""
              className="size-full object-cover"
            />
          ) : (
            <span className="flex size-full items-center justify-center text-xs text-muted-foreground">
              —
            </span>
          )}
        </div>
      </div>

      <div className="min-w-0 flex-1 p-4">
        <p className="text-base font-semibold tracking-tight text-foreground">
          {title}
        </p>
        {qtyUnits ? (
          <div className="mt-1 flex flex-wrap items-baseline gap-x-2 text-sm text-muted-foreground">
            <span>{qtyUnits}</span>
            <ComingSoonButton
              label={ADMIN_REQUESTS_COPY.editAction}
              variant="link"
              size="xs"
            />
          </div>
        ) : null}

        {specRows.length > 0 ? (
          <dl className="mt-4 flex flex-col gap-1 text-sm">
            {specRows.map((row) => (
              <div key={row.key} className="flex flex-wrap gap-x-2">
                <dt className="text-muted-foreground">{row.label}:</dt>
                <dd className="text-foreground">{row.value}</dd>
              </div>
            ))}
          </dl>
        ) : null}

        <div className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-2">
          <ComingSoonButton
            label={ADMIN_REQUESTS_COPY.customizeLine}
            variant="link"
            size="xs"
          />
          <ComingSoonButton
            label={ADMIN_REQUESTS_COPY.notesAndImagesAction}
            variant="link"
            size="xs"
          />
          <ComingSoonButton
            label={ADMIN_REQUESTS_COPY.removeLine}
            variant="link"
            size="xs"
            className="ml-auto text-destructive"
          />
        </div>
      </div>
    </div>
  );
}

export function AdminAddProductComingSoon({
  className,
}: {
  className?: string;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      aria-disabled="true"
      className={cn(
        "h-auto w-full justify-center gap-2 rounded-lg border border-dashed border-border px-4 py-4 text-sm font-medium text-muted-foreground opacity-60 hover:bg-muted/30 has-[>svg]:px-4",
        className,
      )}
      onClick={() => {
        toast.message(ADMIN_REQUESTS_COPY.comingSoon);
      }}
    >
      <Plus className="size-4" aria-hidden />
      {ADMIN_REQUESTS_COPY.addMoreProducts}
    </Button>
  );
}
