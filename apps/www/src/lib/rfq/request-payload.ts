/**
 * SUBMIT REQUEST — endpoint payload shape (v1).
 *
 * Types only, mirroring the agreed contract for PROD-2398 ("Request submit
 * endpoint"): the body the Request Builder will POST when the buyer hits
 * "Request a quote". Provisional until the Sanity content model (PROD-2284)
 * lands.
 *
 * Nothing POSTs this yet — it is built by `toSubmitPayload` and logged to the
 * console so the endpoint can be wired against a real payload.
 *
 * Vocabulary: buyer-first ("Request" / "Quote"); "Brief" is back-office only.
 * "customization", never "capability".
 */

/**
 * How the request was submitted.
 *   `add_to_cart` — product-led (PDP / bookmarks / customization all resolve
 *                   through Products then Your Request).
 *   `webform`     — the cold "Get a Quote" form, no product.
 * A third value is reserved for the services lane; name TBD with product.
 */
export const REQUEST_SOURCES = ['add_to_cart', 'webform'] as const;
export type RequestSource = (typeof REQUEST_SOURCES)[number];

/** What a line is. `described` = free-text express line (no productId). */
export const LINE_TYPES = ['catalog', 'described', 'bundle'] as const;
export type LineType = (typeof LINE_TYPES)[number];

/** Customization axes. Foil stamping is a `finish`, never a material. */
export const CUSTOMIZATION_CATEGORIES = [
    'material',
    'print_method',
    'finish',
    'service',
] as const;
export type CustomizationCategory = (typeof CUSTOMIZATION_CATEGORIES)[number];

/** Sentinel a buyer may choose for any customization dimension. */
export const NOT_SURE = 'not_sure' as const;

/** Quantity rule — data, so client and server validate identically. */
export const QUANTITY_RULES = {
    multipleOf: 100,
    roundingAllowed: false,
} as const;

/** One customization choice applied to a product line. */
export type CustomizationSelection = {
    optionId: string;
    category: CustomizationCategory;
    label: string;
    value: string | typeof NOT_SURE;
    valueLabel?: string;
};

/** An uploaded reference file (artwork / attachment). */
export type FileRef = {
    id: string;
    filename: string;
    mimeType: string;
    sizeBytes: number;
};

/** A postal address — contact address and ship-to destinations. */
export type Address = {
    attention?: string;
    company?: string;
    line1: string;
    line2?: string;
    city: string;
    state?: string;
    postalCode?: string;
    /** ISO-3166 alpha-2. */
    country: string;
    phone?: string;
};

/** Who is asking. Email is the only required contact field (anonymous). */
export type Contact = {
    email: string;
    firstName?: string;
    lastName?: string;
    fullName?: string;
    phone?: string;
    company?: string;
    industry?: string;
    annualSpend?: number;
    /** ISO-4217, applies to annualSpend. */
    annualSpendCurrency?: string;
    address?: Address;
    /** Quick-capture country (ISO-3166); full address in `address`. */
    country?: string;
};

/** Request-level requirements — "Your Requirements", not per product. */
export type Requirements = {
    /** ISO-8601 date. */
    targetInHandsDate?: string;
    targetBudget?: number;
    /** ISO-4217. */
    budgetCurrency?: string;
    useCase?: string;
    /** An array, since one request can split shipments. */
    shippingAddresses?: Address[];
    notes?: string;
};

/** One product in Your Request. */
export type SubmitRequestLine = {
    id: string;
    type: LineType;
    /** null for `described` express lines. */
    productId: string | null;
    /** Product name, or the buyer's free text. */
    name: string;
    /** "What are you putting in the packaging?" */
    contents: string;
    /** One or more quantities to quote. Each a multiple of 100, >= MOQ. */
    quantities: number[];
    customizations: CustomizationSelection[];
    notes?: string;
    fileIds?: string[];
    /** For type === 'bundle' only. */
    bundleMembers?: SubmitRequestLine[];
};

/** The POST body. */
export type SubmitRequestPayload = {
    source: RequestSource;
    contact: Contact;
    requirements: Requirements;
    /** At least one line required. */
    lines: SubmitRequestLine[];
    /** Request-level attachments, not tied to a single line. */
    files?: FileRef[];
    /** Present when resubmitting a saved draft — makes submit idempotent. */
    draftId?: string;
};
