/** Persisted/submitted request contract (PROD-2412). Decoupled from www catalog types. */

export type RequestCustomization = {
  id: string;
  label: string;
  category: string;
};

export type RequestReferenceImage = {
  id: string;
  name: string;
  url: string;
};

export type RequestLine = {
  id: string;
  productSlug: string;
  quantities: number[];
  contents: string;
  customizations: RequestCustomization[];
  notes?: string;
  referenceImages?: RequestReferenceImage[];
  addedAt: string;
};

export type ShippingAddress = {
  id?: string;
  label?: string;
  line1?: string;
  city?: string;
  region?: string;
  country?: string;
  postalCode?: string;
};

export type RequestEntryKind = "express" | "products" | "services";

export type RequestActivityKind =
  | "created"
  | "line_added"
  | "submitted"
  | "version_created"
  | "note_added";

export type RequestActivity = {
  id: string;
  kind: RequestActivityKind;
  message: string;
  occurredAt: string;
  actorName?: string;
  actorType?: "system" | "staff" | "buyer";
  versionNumber?: number;
};

export type RequestVersion = {
  number: number;
  label: string;
  createdAt: string;
  summary?: string;
};

/** Buyer-facing draft fields as stored on a submitted request. */
export type RequestDraft = {
  title?: string;
  notes: string;
  timeline: string;
  packagingContents: string;
  expressQuantities: number[];
  annualSpend: string;
  shippingAddress: ShippingAddress | null;
  companyAddress: ShippingAddress | null;
  contactFirstName: string;
  contactLastName: string;
  contactEmail: string;
  contactPhone: string;
  contactCompany: string;
  contactIndustry: string;
  services: string[];
  servicesEnabled: boolean;
  express: boolean;
  productsExpanded: boolean;
  entryKind: RequestEntryKind;
  submittedAt: string | null;
  ref: string | null;
};

/**
 * A file stored against the request.
 *
 * 🔴 This replaces `RequestDraft.artworkNames`, and the difference is not
 * cosmetic. `artworkNames` came from `rfq.payload.attachments` — what the buyer
 * CLAIMED to send. This comes from the `rfq_attachment` table — what we actually
 * STORED. `persistAttachments` rejects files that fail the type or size check
 * after upload, so the two lists genuinely differ, and offering a download for a
 * name that only ever existed in the payload would 404 on click.
 *
 * `id` is the attachment row id, and it is what the resolve route needs; a name
 * alone can never be downloaded.
 */
export type RequestAttachment = {
  id: string;
  name: string;
  kind: string;
  contentType: string;
  bytes: number | null;
};

export type Request = {
  id: string;
  ownerId: string;
  zohoLeadId?: string | null;
  draft: RequestDraft;
  lines: RequestLine[];
  /** From `rfq_attachment`, readable by the assigned sales member under RLS. */
  attachments: RequestAttachment[];
  submittedAt: string;
  createdAt: string;
  updatedAt: string;
  activities: RequestActivity[];
  versions: RequestVersion[];
};

export type RequestSummary = {
  id: string;
  ref: string | null;
  submittedAt: string;
  contactEmail: string;
  contactCompany: string;
  entryKind: RequestEntryKind;
};
