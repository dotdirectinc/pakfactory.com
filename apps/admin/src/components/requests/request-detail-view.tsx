import type { ReactNode } from "react";
import { RequestDetailCustomerPaperStack } from "@/components/requests/request-detail-customer-paper";
import { RequestAttachments } from "@/components/requests/request-attachments";
import { RequestDetailHeader } from "@/components/requests/request-detail-header";
import { RequestDetailTimeline } from "@/components/requests/request-detail-timeline";
import type { Request, ShippingAddress } from "@pakfactory/domain/request";
import { cn } from "@pakfactory/ui/lib/utils";
import { LogoMark } from "@/components/layout/logo-mark";
import { ADMIN_REQUESTS_COPY } from "@/lib/copy/requests";

/** Grid-cell breakout for the right preview column spacer. */
const PREVIEW_BREAKOUT =
  "w-[calc(100%+max(0px,(100vw-100rem)/2)+2rem)] mr-[calc(-1*max(0px,(100vw-100rem)/2)-2rem)]";

/** Viewport-relative width matching the grid preview column for `position: fixed`. */
const PREVIEW_PANEL_WIDTH =
  "w-[calc((min(100vw,100rem)-4rem-2rem)/2+max(0px,(100vw-100rem)/2)+2rem)]";

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
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="text-sm text-foreground">{value}</dd>
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
    <section className="flex flex-col gap-4 rounded-md border bg-background p-4">
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

  const paperStack = (
    <RequestDetailCustomerPaperStack
      className="h-full min-h-0 flex-1"
      draft={draft}
      lines={lines}
      displayRef={displayRef}
      documentDate={documentDate}
      logoSlot={<LogoMark className="size-9 shrink-0" />}
    />
  );

  return (
    <>
    <div className="relative xl:-mx-8 xl:-mt-12 xl:w-[calc(100%+4rem)]">
      <div className="relative mx-auto w-full max-w-[100rem] px-4 lg:px-8">
        <div className="grid grid-cols-1 gap-8 xl:grid-cols-2 xl:min-h-0 xl:items-stretch">
        <div className="flex min-w-0 flex-col gap-6 pl-4 pt-4 xl:pl-6 xl:pt-6">
        <RequestDetailHeader request={request} />

        <DetailSection title={ADMIN_REQUESTS_COPY.sectionContact}>
            <dl className="grid gap-4 sm:grid-cols-2">
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
                label={ADMIN_REQUESTS_COPY.industryLabel}
                value={draft.contactIndustry || ADMIN_REQUESTS_COPY.emptyValue}
              />
              <DetailField
                label={ADMIN_REQUESTS_COPY.annualSpendLabel}
                value={draft.annualSpend || ADMIN_REQUESTS_COPY.emptyValue}
              />
            </dl>
          </DetailSection>

          <DetailSection title={ADMIN_REQUESTS_COPY.sectionRequirements}>
            <dl className="grid gap-4">
              <DetailField
                label={ADMIN_REQUESTS_COPY.packagingContentsLabel}
                value={draft.packagingContents || ADMIN_REQUESTS_COPY.emptyValue}
              />
              <DetailField
                label={ADMIN_REQUESTS_COPY.briefLabel}
                value={draft.notes || ADMIN_REQUESTS_COPY.emptyValue}
              />
              <DetailField
                label={ADMIN_REQUESTS_COPY.timelineLabel}
                value={draft.timeline || ADMIN_REQUESTS_COPY.emptyValue}
              />
              <DetailField
                label={ADMIN_REQUESTS_COPY.shipToLabel}
                value={formatAddress(draft.shippingAddress)}
              />
            </dl>
          </DetailSection>

          <DetailSection title={ADMIN_REQUESTS_COPY.sectionProductLines}>
            {lines.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {ADMIN_REQUESTS_COPY.emptyProductLines}
              </p>
            ) : (
              <ul className="flex flex-col gap-4">
                {lines.map((line) => (
                  <li
                    key={line.id}
                    className="rounded-md border border-border p-4"
                  >
                    <dl className="grid gap-4 sm:grid-cols-2">
                      <DetailField
                        label={ADMIN_REQUESTS_COPY.productSlugLabel}
                        value={line.productSlug}
                      />
                      <DetailField
                        label={ADMIN_REQUESTS_COPY.quantitiesLabel}
                        value={
                          line.quantities.length > 0
                            ? line.quantities.join(", ")
                            : ADMIN_REQUESTS_COPY.emptyValue
                        }
                      />
                      <DetailField
                        label={ADMIN_REQUESTS_COPY.packagingContentsLabel}
                        value={line.contents || ADMIN_REQUESTS_COPY.emptyValue}
                      />
                      <DetailField
                        label={ADMIN_REQUESTS_COPY.customizationsLabel}
                        value={
                          line.customizations.length > 0
                            ? line.customizations
                                .map((customization) => customization.label)
                                .join(", ")
                            : ADMIN_REQUESTS_COPY.emptyValue
                        }
                      />
                    </dl>
                  </li>
                ))}
              </ul>
            )}
          </DetailSection>

          <RequestDetailTimeline
            activities={request.activities}
            versions={request.versions}
          />

          {/* Always rendered, unlike the old names-only block which hid itself
              when empty. A rep needs to know a request has NO files as much as
              which ones it has — an absent section reads as "not loaded yet". */}
          <DetailSection title={ADMIN_REQUESTS_COPY.sectionArtwork}>
            <RequestAttachments
              rfqId={request.id}
              attachments={request.attachments}
            />
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
        </div>

        <aside className="relative flex min-h-0 flex-col xl:hidden">
          {paperStack}
        </aside>

        <aside
          aria-hidden
          className={cn(
            "relative hidden min-h-0 flex-col xl:flex xl:self-stretch",
            PREVIEW_BREAKOUT,
          )}
        >
          <div className="pointer-events-none absolute inset-0 bg-[#f2f2f2]" />
        </aside>
        </div>
      </div>
    </div>

    <div
      className={cn(
        "fixed top-[68px] right-0 z-10 hidden h-[calc(100dvh-68px)] flex-col overflow-hidden bg-[#f2f2f2] xl:flex",
        PREVIEW_PANEL_WIDTH,
      )}
    >
      {paperStack}
    </div>
    </>
  );
}
