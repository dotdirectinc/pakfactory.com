import type { ReactNode } from "react";
import {
  AdminAddProductComingSoon,
  AdminRequestProductCard,
} from "@/components/requests/admin-request-product-card";
import { RequestDetailCustomerPaperStack } from "@/components/requests/request-detail-customer-paper";
import { RequestAttachments } from "@/components/requests/request-attachments";
import { RequestDetailHeader } from "@/components/requests/request-detail-header";
import { RequestDetailTimeline } from "@/components/requests/request-detail-timeline";
import type { Request, ShippingAddress } from "@pakfactory/request/request";
import { cn } from "@pakfactory/ui/lib/utils";
import { LogoMark } from "@/components/layout/logo-mark";
import { ADMIN_REQUESTS_COPY } from "@/lib/copy/requests";
import { entryKindLabel } from "@/lib/request-entry-kind";

type RequestDetailViewProps = {
  request: Request;
};

function formatAddress(address: ShippingAddress | null): string {
  if (!address) return ADMIN_REQUESTS_COPY.emptyValue;

  const parts = [
    address.line1,
    address.city,
    address.region,
    address.country,
    address.postalCode,
  ].filter((part) => part && part.trim().length > 0);

  return parts.length > 0 ? parts.join(", ") : ADMIN_REQUESTS_COPY.emptyValue;
}

function DetailField({
  label,
  value,
  preserveWhitespace = false,
}: {
  label: string;
  value: string;
  preserveWhitespace?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          "text-sm text-foreground",
          preserveWhitespace && "whitespace-pre-wrap break-words",
        )}
      >
        {value}
      </dd>
    </div>
  );
}

function DetailSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4 rounded-lg border border-border bg-background p-4">
      <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
      {children}
    </section>
  );
}

export function RequestDetailView({ request }: RequestDetailViewProps) {
  const { draft, lines } = request;
  const displayRef = draft.ref ?? request.id;
  const contactName = [draft.contactFirstName, draft.contactLastName]
    .filter(Boolean)
    .join(" ");
  const documentDate = new Date(request.submittedAt).toLocaleDateString(
    "en-US",
    {
      year: "numeric",
      month: "long",
      day: "numeric",
    },
  );

  const paperPreview = (
    <RequestDetailCustomerPaperStack
      variant="drawer"
      draft={draft}
      lines={lines}
      displayRef={displayRef}
      documentDate={documentDate}
      logoSlot={<LogoMark className="size-9 shrink-0" />}
    />
  );

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
      <RequestDetailHeader request={request} preview={paperPreview} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(16rem,1fr)] lg:items-start">
        <div className="flex min-w-0 flex-col gap-4">
          <DetailSection title={ADMIN_REQUESTS_COPY.sectionProductLines}>
            {lines.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {ADMIN_REQUESTS_COPY.emptyProductLines}
              </p>
            ) : (
              <ul className="flex flex-col gap-4">
                {lines.map((line) => (
                  <li key={line.id}>
                    <AdminRequestProductCard line={line} />
                  </li>
                ))}
              </ul>
            )}
            <AdminAddProductComingSoon />
          </DetailSection>

          {draft.servicesEnabled ? (
            <DetailSection title={ADMIN_REQUESTS_COPY.sectionServices}>
              {draft.services.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {ADMIN_REQUESTS_COPY.emptyServices}
                </p>
              ) : (
                <ul className="list-inside list-disc text-sm text-foreground">
                  {draft.services.map((service) => (
                    <li key={service}>{service}</li>
                  ))}
                </ul>
              )}
            </DetailSection>
          ) : null}

          <DetailSection title={ADMIN_REQUESTS_COPY.sectionRequirements}>
            <dl className="grid gap-4 sm:grid-cols-2">
              <DetailField
                label={ADMIN_REQUESTS_COPY.requirementTypeLabel}
                value={entryKindLabel(draft.entryKind)}
              />
              <DetailField
                label={ADMIN_REQUESTS_COPY.timelineLabel}
                value={draft.timeline || ADMIN_REQUESTS_COPY.emptyValue}
              />
              <DetailField
                label={ADMIN_REQUESTS_COPY.packagingContentsLabel}
                value={
                  draft.packagingContents || ADMIN_REQUESTS_COPY.emptyValue
                }
              />
              <DetailField
                label={ADMIN_REQUESTS_COPY.shipToLabel}
                value={formatAddress(draft.shippingAddress)}
              />
              <div className="sm:col-span-2">
                <DetailField
                  label={ADMIN_REQUESTS_COPY.briefLabel}
                  value={draft.notes || ADMIN_REQUESTS_COPY.emptyValue}
                  preserveWhitespace
                />
              </div>
            </dl>
          </DetailSection>

          <DetailSection title={ADMIN_REQUESTS_COPY.sectionArtwork}>
            <RequestAttachments
              rfqId={request.id}
              attachments={request.attachments}
            />
          </DetailSection>

          <RequestDetailTimeline activities={request.activities} />
        </div>

        <aside className="flex min-w-0 flex-col gap-4 lg:sticky lg:top-4 lg:self-start">
          <DetailSection title={ADMIN_REQUESTS_COPY.sectionCustomer}>
            <dl className="grid gap-4">
              <DetailField
                label={ADMIN_REQUESTS_COPY.nameLabel}
                value={contactName || ADMIN_REQUESTS_COPY.emptyValue}
              />
              <DetailField
                label={ADMIN_REQUESTS_COPY.emailLabel}
                value={draft.contactEmail || ADMIN_REQUESTS_COPY.emptyValue}
              />
              <DetailField
                label={ADMIN_REQUESTS_COPY.phoneLabel}
                value={draft.contactPhone || ADMIN_REQUESTS_COPY.emptyValue}
              />
              <DetailField
                label={ADMIN_REQUESTS_COPY.companyLabel}
                value={draft.contactCompany || ADMIN_REQUESTS_COPY.emptyValue}
              />
              <DetailField
                label={ADMIN_REQUESTS_COPY.companyAddressLabel}
                value={formatAddress(draft.companyAddress)}
              />
              <DetailField
                label={ADMIN_REQUESTS_COPY.industryLabel}
                value={draft.contactIndustry || ADMIN_REQUESTS_COPY.emptyValue}
              />
              <DetailField
                label={ADMIN_REQUESTS_COPY.annualSpendLabel}
                value={draft.annualSpend || ADMIN_REQUESTS_COPY.emptyValue}
              />
            </dl>
          </DetailSection>
        </aside>
      </div>
    </div>
  );
}
