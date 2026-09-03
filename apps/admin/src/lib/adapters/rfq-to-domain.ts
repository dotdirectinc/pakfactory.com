import type {
  Request,
  RequestDraft,
  RequestLine,
  RequestSummary,
  RequestAttachment,
  RequestEntryKind,
  ShippingAddress,
} from "@pakfactory/domain/request";

/**
 * Maps a `public.rfq` row onto the domain shapes the admin views render.
 *
 * ── Why a mapper is needed at all ───────────────────────────────────────────
 * `rfq.payload` holds the SUBMIT CONTRACT (`RequestSubmission` in
 * pakfactory.com-backend/src/contracts/request.ts): `contact{}`,
 * `requirements{}`, `shipTo`, `metadata{}`. The domain's `RequestDraft`
 * (PROD-2412) describes the BUILDER'S LOCAL STATE: flat `contactFirstName`,
 * `notes`, `express`, `productsExpanded`. Two shapes for one thing, designed
 * independently. This module is the seam, and keeping it in one file means the
 * translation is reviewable rather than smeared across two adapters.
 */

/** The stored submission, narrowed to what this mapper reads. */
type StoredSubmission = {
  contact?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    company?: string;
    industry?: string;
  };
  requirements?: {
    notes?: string;
    timeline?: string;
    packagingContents?: string;
    expressQuantity?: number;
    expressQuantities?: number[];
    annualSpendBand?: string;
  };
  shipTo?: ShippingAddress | null;
  companyOffice?: ShippingAddress | null;
  lines?: {
    id: string;
    productSlug: string;
    contents?: string;
    quantities?: number[];
    customizations?: { id: string; label: string; category?: string }[];
    notes?: string;
    addedAt?: string;
  }[];
  services?: string[];
  attachments?: { id: string; name: string; kind?: string }[];
  metadata?: { entryKind?: RequestEntryKind };
};

/** A row of `public.rfq_attachment` — OUR index of what was actually stored. */
export type RfqAttachmentRow = {
  id: string;
  filename: string;
  kind: string | null;
  content_type: string | null;
  bytes: number | string | null;
};

export type RfqRow = {
  id: string;
  reference: string | null;
  contact_email: string;
  customer_id: string | null;
  crm_lead_id: string | null;
  payload: unknown;
  submitted_at: string;
  created_at: string;
  updated_at: string;
};

/**
 * 🔴 Read from `rfq_attachment`, NEVER from `payload.attachments`.
 *
 * The payload lists what the buyer's browser said it uploaded. This table lists
 * what `persistAttachments` actually kept — it drops files that fail the type or
 * size check after upload, and files whose key was not under the submission's own
 * `pending/` prefix. Rendering the payload copy would offer downloads that 404,
 * and only the row carries the `id` the resolve route needs.
 *
 * `bytes` is bigint in Postgres, which PostgREST serialises as a STRING to avoid
 * precision loss. Coerce, or the UI formats "248310" as NaN.
 */
export function toAttachments(rows: RfqAttachmentRow[] | null): RequestAttachment[] {
  return (rows ?? []).map((r) => ({
    id: r.id,
    name: r.filename,
    kind: r.kind ?? "reference",
    contentType: r.content_type ?? "application/octet-stream",
    bytes: r.bytes === null || r.bytes === undefined ? null : Number(r.bytes),
  }));
}

const asSubmission = (payload: unknown): StoredSubmission =>
  payload && typeof payload === "object" ? (payload as StoredSubmission) : {};

/** Both spellings are accepted server-side during the migration window, so both
 *  are read here — reading only the singular would drop every tier after the
 *  first, which is the bug the contract was widened to remove. */
function expressQuantities(r: StoredSubmission["requirements"]): number[] {
  const many = r?.expressQuantities ?? [];
  const one = typeof r?.expressQuantity === "number" ? [r.expressQuantity] : [];
  return [...new Set([...one, ...many])];
}

export function toRequestSummary(row: RfqRow): RequestSummary {
  const s = asSubmission(row.payload);
  return {
    id: row.id,
    ref: row.reference,
    submittedAt: row.submitted_at,
    // The column is authoritative — it is normalised at intake, where the
    // payload copy is whatever the buyer typed.
    contactEmail: row.contact_email,
    contactCompany: s.contact?.company ?? "",
    entryKind: s.metadata?.entryKind ?? "products",
  };
}

function toDraft(row: RfqRow, s: StoredSubmission): RequestDraft {
  const lines = s.lines ?? [];
  return {
    notes: s.requirements?.notes ?? "",
    timeline: s.requirements?.timeline ?? "",
    packagingContents: s.requirements?.packagingContents ?? "",
    expressQuantities: expressQuantities(s.requirements),
    // The builder collects a band label ("under-50k"); the domain field is a
    // free-text string, so the label passes through unchanged.
    annualSpend: s.requirements?.annualSpendBand ?? "",
    shippingAddress: s.shipTo ?? null,
    companyAddress: s.companyOffice ?? null,
    contactFirstName: s.contact?.firstName ?? "",
    contactLastName: s.contact?.lastName ?? "",
    contactEmail: s.contact?.email ?? row.contact_email,
    contactPhone: s.contact?.phone ?? "",
    contactCompany: s.contact?.company ?? "",
    contactIndustry: s.contact?.industry ?? "",
    services: s.services ?? [],
    // Derived, not stored: the submission records WHICH services were chosen,
    // and the builder's toggle is a UI state that never crossed the wire.
    servicesEnabled: (s.services?.length ?? 0) > 0,
    express: s.metadata?.entryKind === "express",
    productsExpanded: lines.length > 0,
    entryKind: s.metadata?.entryKind ?? "products",
    submittedAt: row.submitted_at,
    ref: row.reference,
  };
}

function toLines(row: RfqRow, s: StoredSubmission): RequestLine[] {
  return (s.lines ?? []).map((line) => ({
    id: line.id,
    productSlug: line.productSlug,
    quantities: line.quantities ?? [],
    contents: line.contents ?? "",
    customizations: (line.customizations ?? []).map((c) => ({
      id: c.id,
      label: c.label,
      // ⚠️ Required by the domain type, optional in the submit contract. Empty
      // rather than invented: a made-up category would read as fact in the UI.
      category: c.category ?? "",
    })),
    ...(line.notes ? { notes: line.notes } : {}),
    // Per-line reference images have no upload step yet, so there is nothing to
    // point at. Omitted rather than fabricated (ADR-0013).
    // `addedAt` is required by the contract, so it is present on anything that
    // passed validation. The fallback only guards rows written before it was —
    // an empty string here would render as "Invalid Date".
    addedAt: line.addedAt ?? row.submitted_at,
  }));
}

export function toRequest(
  row: RfqRow,
  attachmentRows: RfqAttachmentRow[] | null = null,
): Request {
  const s = asSubmission(row.payload);
  return {
    id: row.id,
    // 🔴 The domain requires a string; `customer_id` is NULLABLE because
    // submission is anonymous by design (no sign-in gate — ADR-0012 D1). An
    // empty string says "nobody owns this account-side", which is true, and is
    // preferable to inventing an id the buyer portal would then fail to match.
    ownerId: row.customer_id ?? "",
    zohoLeadId: row.crm_lead_id,
    draft: toDraft(row, s),
    lines: toLines(row, s),
    attachments: toAttachments(attachmentRows),
    submittedAt: row.submitted_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    // 🔴 No source data. `activities` and `versions` come from PROD-2412's model,
    // which has no counterpart in `public.rfq` — nothing records a request's
    // history, and ADR-0008 D10 puts revision chains in `spec_instance`, which is
    // unbuilt. Empty is honest; a synthesised "submitted" entry would be a
    // timeline the system did not observe.
    activities: [],
    versions: [],
  };
}
