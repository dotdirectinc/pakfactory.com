"use client";

import { Plus } from "lucide-react";
import { toast } from "sonner";
import type { RequestLine } from "@pakfactory/request/request";
import { RequestProductCard } from "@pakfactory/brief-builder-ui/request-product-card";
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

function formatQuantityList(quantities: number[]): string {
  return quantities.map((n) => n.toLocaleString("en-US")).join(", ");
}

const LINK_ACTION_CLASS =
  "h-auto p-0 text-xs font-medium text-primary underline underline-offset-4";

/**
 * Admin controller over shared RequestProductCard chrome.
 * Action links toast Coming Soon until edit is enabled.
 */
export function AdminRequestProductCard({ line }: AdminRequestProductCardProps) {
  const title = humanizeSlug(line.productSlug) || line.productSlug;
  const qtyList = formatQuantityList(line.quantities);
  const thumbSrc = line.referenceImages?.[0]?.url ?? null;

  const customizationItems = line.customizations
    .map((c) => c.label?.trim())
    .filter(Boolean) as string[];

  const notesItems: { key: string; label: string; value: string }[] = [];
  if (line.contents.trim()) {
    notesItems.push({
      key: "contents",
      label: ADMIN_REQUESTS_COPY.contentsLabel,
      value: line.contents.trim(),
    });
  }
  if (line.notes?.trim()) {
    notesItems.push({
      key: "notes",
      label: ADMIN_REQUESTS_COPY.notesLabel,
      value: line.notes.trim(),
    });
  }
  const imageCount = line.referenceImages?.length ?? 0;
  if (imageCount === 1) {
    notesItems.push({
      key: "images",
      label: ADMIN_REQUESTS_COPY.notesAndImagesAction,
      value: "1 image",
    });
  } else if (imageCount > 1) {
    notesItems.push({
      key: "images",
      label: ADMIN_REQUESTS_COPY.notesAndImagesAction,
      value: `${imageCount} images`,
    });
  }

  function editAction() {
    return (
      <ComingSoonButton
        label={ADMIN_REQUESTS_COPY.editAction}
        variant="link"
        size="xs"
        className={LINK_ACTION_CLASS}
      />
    );
  }

  return (
    <RequestProductCard
      title={title}
      thumbSrc={thumbSrc}
      thumbObjectClassName="object-cover"
      detailRows={[
        {
          key: "quantity",
          label: ADMIN_REQUESTS_COPY.quantityLabel,
          action: editAction(),
          children: qtyList ? (
            qtyList
          ) : (
            <span className="text-muted-foreground">
              {ADMIN_REQUESTS_COPY.notAdded}
            </span>
          ),
        },
        {
          key: "customization",
          label: ADMIN_REQUESTS_COPY.customizationRowLabel,
          action: editAction(),
          children:
            customizationItems.length > 0 ? (
              <ul className="flex flex-col gap-1">
                {customizationItems.map((label) => (
                  <li key={label}>
                    <span className="font-medium text-foreground">{label}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <span className="text-muted-foreground">
                {ADMIN_REQUESTS_COPY.notAdded}
              </span>
            ),
        },
        {
          key: "notes",
          label: ADMIN_REQUESTS_COPY.notesAndImageRowLabel,
          action: editAction(),
          children:
            notesItems.length > 0 ? (
              <ul className="flex flex-col gap-1">
                {notesItems.map((row) => (
                  <li key={row.key}>
                    <span className="text-muted-foreground">{row.label}: </span>
                    <span className="font-medium text-foreground">
                      {row.value}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <span className="text-muted-foreground">
                {ADMIN_REQUESTS_COPY.notAdded}
              </span>
            ),
        },
      ]}
      footer={
        <ComingSoonButton
          label={ADMIN_REQUESTS_COPY.removeLine}
          variant="link"
          size="xs"
          className={cn(LINK_ACTION_CLASS, "text-destructive")}
        />
      }
    />
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
