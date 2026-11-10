import type {
    CatalogMedia,
    CustomizationOption,
    ProductDimensionRange,
} from '@/lib/catalog/types';
import type {CustomizationRulesSnapshot} from '@/lib/catalog/customization-rules';
import {
    parseBuilderState,
    type CustomizationBuilderState,
} from '@/lib/customization-builder';

export const REQUEST_STORAGE_KEY = 'pakfactory.request.v1';

export type RequestCustomization = Pick<
    CustomizationOption,
    'id' | 'label' | 'category'
>;

export type RequestReferenceImage = {
    id: string;
    name: string;
    /**
     * `blob:` URL for the local thumbnail ONLY. It never crosses the wire — a URL
     * on the submitted payload is exactly what ADR-0013 D3 rules out — and it does
     * not survive a page reload, so a persisted image without a `key` is a dead
     * preview and is dropped at submit.
     */
    url: string;
    /** The S3 object key minted by the presign endpoint. This is what is sent. */
    key?: string;
    /** Optional so drafts persisted before uploads existed still deserialise. */
    status?: 'uploading' | 'uploaded' | 'error';
    bytes?: number;
};

export type RequestLine = {
    id: string;
    productSlug: string;
    /** Snapshotted at add-to-request so client UI does not need a sync catalog. */
    productTitle?: string;
    /** Catalog SKU snapshotted at add-to-request (shown above the title). */
    productSku?: string;
    /** Catalog product-line title (e.g. "Rigid Box") for request card meta. */
    productLineTitle?: string;
    /** The product's MOQ at add time, sent with the request so sales sees it (PROD-2605). */
    productMoq?: number;
    productMedia?: CatalogMedia[];
    availableCustomizations?: CustomizationOption[];
    /** The product's customization rules at add time (PROD-2556), so /request narrows the same way. */
    customizationRules?: CustomizationRulesSnapshot;
    /** Product dimensionInput shape key (snapshotted at add). */
    dimensionInput?: string;
    /** Product dimensionRange in mm from Sanity (snapshotted at add). */
    dimensionRange?: ProductDimensionRange;
    /**
     * Product Printable Sides (Sanity) snapshotted at add — drives Printing gate
     * on /request reopen without a live catalog fetch.
     */
    printableSides?: {slug: string; title: string}[];
    quantities: number[];
    contents: string;
    customizations: RequestCustomization[];
    /** Guided / workspace answers for PROD-2344 Customization Builder. */
    customizationBuilder?: CustomizationBuilderState;
    notes?: string;
    referenceImages?: RequestReferenceImage[];
    addedAt: string;
};

export type AddLineInput = {
    productSlug: string;
    productTitle?: string;
    productSku?: string;
    productLineTitle?: string;
    productMoq?: number;
    productMedia?: CatalogMedia[];
    availableCustomizations?: CustomizationOption[];
    customizationRules?: CustomizationRulesSnapshot;
    dimensionInput?: string;
    dimensionRange?: ProductDimensionRange;
    printableSides?: {slug: string; title: string}[];
    quantities: number[];
    contents: string;
    customizations: RequestCustomization[];
    customizationBuilder?: CustomizationBuilderState;
    notes?: string;
    referenceImages?: RequestReferenceImage[];
};

export type ShippingAddress = {
    id?: string;
    label?: string;
    line1?: string;
    line2?: string;
    city?: string;
    region?: string;
    country?: string;
    postalCode?: string;
    /** ISO 3166-1 alpha-2 when chosen from the country list. */
    countryCode?: string;
    /** ISO 3166-2 when chosen from the region list. */
    regionCode?: string;
};

export type RequestEntryKind = 'express' | 'products' | 'services';

export type RequestDraft = {
    /**
     * Identifies the DRAFT — stable across edit-and-resubmit, and the grouping
     * key the backend stores as `rfq.draft_id` (ADR-0012 D10).
     *
     * ⚠️ NOT the idempotency key. That is a per-submit-CLICK id minted in
     * `submitRequest`, because a buyer who edits and resubmits has formed a
     * second intent and is entitled to a second RFQ — whether two similar
     * requests are really one is sales' judgement, not ours. This id is what
     * lets them see the two came from one draft and make that call.
     */
    id: string;
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
    /**
     * Display names only, kept for drafts persisted before uploads existed.
     * 🔴 NOT what is submitted — a name is not a file. `referenceImages` is.
     */
    artworkNames: string[];
    /** Request-level uploads (the requirements-step dropzone). */
    referenceImages?: RequestReferenceImage[];
    /**
     * Consent at submit (c45, Unreleased · POC): optional email opt-in for packaging
     * ideas and offers. Off unless ticked. Not sent to the backend yet (needs a field).
     */
    marketingOptIn?: boolean;
    /**
     * R36 What do you need? (quote request on the Contact page). Absent = packaging,
     * today's behaviour. 'service' drops the packaging fields and makes ship-to optional.
     */
    need?: 'packaging' | 'service' | 'both';
    /** R36 (owner Nov 3): what the buyer ticked, as a list that can grow. See lib/intake/needs.ts. */
    needs?: string[];
    /** Step intake (Nov 2): the "Something else" service, in the buyer's words (services holds OTHER_SERVICE_ID). */
    serviceOther?: string;
    /**
     * Step intake (Nov 2): the buyer picked on How we can help in THIS visit. Not read back from
     * storage, and cleared when the entry resumes a request, so a new visit starts with nothing
     * picked; going Back within the visit keeps it. `need` and the answers under it are kept.
     */
    needPicked?: boolean;
    /**
     * Website PRD v4.7 (R36, owner Nov 6): the door that opened the general request set the need
     * (e.g. a packaging landing page's Get a Quote), so Project details hides the choice and offers
     * the other need as an add-on. Kept across reloads, unlike needPicked.
     */
    needFromDoor?: boolean;
    /** Step intake Contact (Nov 2): the buyer's company website. Backend field still needed. */
    contactWebsite?: string;
    /** Product/service request opened on the sectioned or step intake, not the one-page form (Nov 2). */
    stepIntake?: boolean;
    /** General quote intake on the step shell (Nov 1): ship-to is not asked. */
    shipToOptional?: boolean;
    /** Intake v3 offer screens answered (e.g. design help): yes / no. */
    intakeOffers?: Record<string, 'yes' | 'no'>;
    /**
     * When set, the Request Builder (and submit) only includes these pool line
     * ids. `null` means all lines (express / legacy / services).
     */
    builderLineIds: string[] | null;
    /** Sectioned request: items the buyer unticked in the request's Items section (new items join ticked). */
    excludedLineIds?: string[];
    submittedAt: string | null;
    ref: string | null;
};

export type RequestState = {
    lines: RequestLine[];
    draft: RequestDraft;
    /**
     * Named drafts the buyer chose to keep (Website PRD R22, WEB-J1 D5).
     * Each holds its brief and the lines that were in it; those lines are no
     * longer in `lines` (the pool) until the draft is continued or deleted.
     * Browser-only for now; following a signed-in buyer is R23 (next phase).
     */
    savedDrafts?: SavedDraft[];
    /**
     * R22 (model B): which request is open. null = "New request". When a saved
     * draft is open, `lines` + `draft` ARE that draft (so Add to request, the
     * brief and submit all act on it) and its savedDrafts entry is refreshed on
     * every switch. The New request waits in `stashedNew` meanwhile.
     */
    activeDraftId?: string | null;
    stashedNew?: {lines: RequestLine[]; draft: RequestDraft} | null;
};

export type SavedDraft = {
    id: string;
    savedAt: string;
    draft: RequestDraft;
    lines: RequestLine[];
};

export const EMPTY_DRAFT: RequestDraft = {
    // Minted per module load rather than per draft; parseDraft below mints a
    // fresh one for any draft that lacks it, so no two drafts ever share this.
    id: newId('draft'),
    notes: '',
    timeline: '',
    packagingContents: '',
    expressQuantities: [],
    annualSpend: '',
    shippingAddress: null,
    companyAddress: null,
    contactFirstName: '',
    contactLastName: '',
    contactEmail: '',
    contactPhone: '',
    contactCompany: '',
    contactIndustry: '',
    services: [],
    servicesEnabled: false,
    express: false,
    productsExpanded: false,
    entryKind: 'products',
    artworkNames: [],
    builderLineIds: null,
    submittedAt: null,
    ref: null,
};

const EMPTY_STATE: RequestState = {
    lines: [],
    draft: EMPTY_DRAFT,
};

const listeners = new Set<() => void>();

let cachedRaw: string | null | undefined;
let cachedState: RequestState = EMPTY_STATE;

function isRequestLine(value: unknown): value is RequestLine {
    if (!value || typeof value !== 'object') return false;
    const line = value as RequestLine;
    if (
        typeof line.id !== 'string' ||
        typeof line.productSlug !== 'string' ||
        !Array.isArray(line.quantities) ||
        typeof line.contents !== 'string' ||
        !Array.isArray(line.customizations)
    ) {
        return false;
    }
    if (line.customizationBuilder !== undefined) {
        line.customizationBuilder = parseBuilderState(line.customizationBuilder);
    }
    if (line.dimensionRange !== undefined) {
        const parsed = parseDimensionRange(line.dimensionRange);
        if (parsed) line.dimensionRange = parsed;
        else delete line.dimensionRange;
    }
    if (
        line.dimensionInput !== undefined &&
        (typeof line.dimensionInput !== 'string' || !line.dimensionInput.trim())
    ) {
        delete line.dimensionInput;
    } else if (typeof line.dimensionInput === 'string') {
        line.dimensionInput = line.dimensionInput.trim();
    }
    if (line.printableSides !== undefined) {
        if (!Array.isArray(line.printableSides)) {
            delete line.printableSides;
        } else {
            line.printableSides = line.printableSides
                .filter(
                    (side): side is {slug: string; title: string} =>
                        Boolean(side) &&
                        typeof side === 'object' &&
                        typeof side.slug === 'string' &&
                        Boolean(side.slug.trim()) &&
                        typeof side.title === 'string' &&
                        Boolean(side.title.trim()),
                )
                .map((side) => ({
                    slug: side.slug.trim(),
                    title: side.title.trim(),
                }));
            if (line.printableSides.length === 0) delete line.printableSides;
        }
    }
    return true;
}

function asString(value: unknown, fallback = ''): string {
    return typeof value === 'string' ? value : fallback;
}

function asBool(value: unknown, fallback = false): boolean {
    return typeof value === 'boolean' ? value : fallback;
}

function parseDimensionRange(value: unknown): ProductDimensionRange | undefined {
    if (!value || typeof value !== 'object') return undefined;
    const raw = value as Record<string, unknown>;
    const next: ProductDimensionRange = {};
    for (const key of [
        'lengthMin',
        'lengthMax',
        'widthMin',
        'widthMax',
        'heightMin',
        'heightMax',
        'diameterMin',
        'diameterMax',
        'gussetMin',
        'gussetMax',
        'dropMin',
        'dropMax',
        'depthMin',
        'depthMax',
    ] as const) {
        const n = raw[key];
        if (typeof n === 'number' && Number.isFinite(n)) {
            next[key] = n;
        }
    }
    return Object.keys(next).length > 0 ? next : undefined;
}

function parseExpressQuantities(value: unknown, legacy?: unknown): number[] {
    if (Array.isArray(value)) {
        return [
            ...new Set(
                value.filter(
                    (n): n is number =>
                        typeof n === 'number' &&
                        Number.isFinite(n) &&
                        n > 0,
                ),
            ),
        ].sort((a, b) => a - b);
    }
    if (typeof legacy === 'string') {
        const digits = legacy.replace(/[^0-9]/g, '');
        const n = Number(digits);
        if (digits.length > 0 && n > 0) return [n];
    }
    return [];
}

function parseShipping(value: unknown): ShippingAddress | null {
    if (!value || typeof value !== 'object') return null;
    const a = value as ShippingAddress;
    return {
        ...(typeof a.id === 'string' ? {id: a.id} : {}),
        ...(typeof a.label === 'string' ? {label: a.label} : {}),
        ...(typeof a.line1 === 'string' ? {line1: a.line1} : {}),
        ...(typeof a.line2 === 'string' ? {line2: a.line2} : {}),
        ...(typeof a.city === 'string' ? {city: a.city} : {}),
        ...(typeof a.region === 'string' ? {region: a.region} : {}),
        ...(typeof a.country === 'string' ? {country: a.country} : {}),
        ...(typeof a.postalCode === 'string' ? {postalCode: a.postalCode} : {}),
        ...(typeof a.countryCode === 'string' ? {countryCode: a.countryCode} : {}),
        ...(typeof a.regionCode === 'string' ? {regionCode: a.regionCode} : {}),
    };
}


function parseEntryKind(
    value: unknown,
    express: boolean,
    _productsExpanded: boolean,
): RequestEntryKind {
    if (value === 'express' || value === 'products' || value === 'services') {
        return value;
    }
    if (express) return 'express';
    return 'products';
}

function parseDraft(value: unknown): RequestDraft {
    if (!value || typeof value !== 'object') return {...EMPTY_DRAFT, id: newId('draft')};
    const d = value as Partial<RequestDraft>;
    return {
        ...EMPTY_DRAFT,
        // Every draft saved before this field existed gets one on first read,
        // so `pakfactory.request.v1` needs no migration step and no version bump.
        id: typeof d.id === 'string' && d.id ? d.id : newId('draft'),
        title: typeof d.title === 'string' ? d.title : undefined,
        notes: asString(d.notes),
        timeline: asString(d.timeline),
        packagingContents: asString(d.packagingContents),
        expressQuantities: parseExpressQuantities(
            (d as {expressQuantities?: unknown}).expressQuantities,
            (d as {expressQuantity?: unknown}).expressQuantity,
        ),
        annualSpend: asString(d.annualSpend),
        shippingAddress: parseShipping(d.shippingAddress),
        companyAddress: parseShipping(d.companyAddress),
        contactFirstName: asString(d.contactFirstName),
        contactLastName: asString(d.contactLastName),
        contactEmail: asString(d.contactEmail),
        contactPhone: asString(d.contactPhone),
        contactCompany: asString(d.contactCompany),
        contactIndustry: asString(d.contactIndustry),
        services: Array.isArray(d.services)
            ? d.services.filter((s): s is string => typeof s === 'string')
            : [],
        servicesEnabled: asBool(d.servicesEnabled),
        express: asBool(d.express),
        productsExpanded: asBool(d.productsExpanded),
        entryKind: parseEntryKind(d.entryKind, asBool(d.express), asBool(d.productsExpanded)),
        ...(Array.isArray(d.referenceImages)
            ? {referenceImages: d.referenceImages as RequestReferenceImage[]}
            : {}),
        artworkNames: Array.isArray(d.artworkNames)
            ? d.artworkNames.filter((s): s is string => typeof s === 'string')
            : [],
        builderLineIds: parseBuilderLineIds(
            (d as {builderLineIds?: unknown}).builderLineIds,
        ),
        ...(Array.isArray((d as {excludedLineIds?: unknown}).excludedLineIds)
            ? {excludedLineIds: ((d as {excludedLineIds: unknown[]}).excludedLineIds).filter((x): x is string => typeof x === 'string')}
            : {}),
        submittedAt:
            typeof d.submittedAt === 'string' || d.submittedAt === null
                ? d.submittedAt
                : null,
        ref: typeof d.ref === 'string' || d.ref === null ? d.ref : null,
        // Kept across reloads (Nov 2): these were dropped on read, so a resumed intake lost them.
        ...(d.need === 'packaging' || d.need === 'service' || d.need === 'both' ? {need: d.need} : {}),
        ...(Array.isArray(d.needs) ? {needs: (d.needs as unknown[]).filter((x): x is string => typeof x === 'string')} : {}),
        ...(typeof d.marketingOptIn === 'boolean' ? {marketingOptIn: d.marketingOptIn} : {}),
        ...(typeof d.shipToOptional === 'boolean' ? {shipToOptional: d.shipToOptional} : {}),
        ...(typeof d.serviceOther === 'string' ? {serviceOther: d.serviceOther} : {}),
        ...(typeof d.contactWebsite === 'string' ? {contactWebsite: d.contactWebsite} : {}),
        ...(typeof d.stepIntake === 'boolean' ? {stepIntake: d.stepIntake} : {}),
        ...(typeof d.needFromDoor === 'boolean' ? {needFromDoor: d.needFromDoor} : {}),
        // needPicked is NOT read back (owner Nov 2): a new visit (reload, Save & exit, a door)
        // starts How we can help with nothing picked; the answers under it are kept.
        ...(d.intakeOffers && typeof d.intakeOffers === 'object'
            ? {
                  intakeOffers: Object.fromEntries(
                      Object.entries(d.intakeOffers).filter(([, v]) => v === 'yes' || v === 'no'),
                  ) as Record<string, 'yes' | 'no'>,
              }
            : {}),
    };
}

function parseBuilderLineIds(value: unknown): string[] | null {
    if (value == null) return null;
    if (!Array.isArray(value)) return null;
    const ids = value.filter((id): id is string => typeof id === 'string' && id.length > 0);
    return ids.length > 0 ? ids : null;
}

/** Pool lines in scope for the Request Builder / submit. */
export function linesForBuilder(
    lines: RequestLine[],
    draft: RequestDraft,
): RequestLine[] {
    if (!draft.builderLineIds) return lines;
    const idSet = new Set(draft.builderLineIds);
    return lines.filter((line) => idSet.has(line.id));
}

function parseState(raw: string | null): RequestState {
    if (!raw) return EMPTY_STATE;
    try {
        const parsed: unknown = JSON.parse(raw);
        // Legacy: bare array of lines (PROD-2342).
        if (Array.isArray(parsed)) {
            const lines = parsed.filter(isRequestLine);
            return {
                lines: lines.length ? lines : [],
                draft: {...EMPTY_DRAFT, productsExpanded: lines.length > 0},
            };
        }
        if (!parsed || typeof parsed !== 'object') return EMPTY_STATE;
        const obj = parsed as {lines?: unknown; draft?: unknown; savedDrafts?: unknown; activeDraftId?: unknown; stashedNew?: unknown};
        const lines = Array.isArray(obj.lines)
            ? obj.lines.filter(isRequestLine)
            : [];
        const savedDrafts = parseSavedDrafts(obj.savedDrafts);
        const activeDraftId = typeof obj.activeDraftId === 'string' && savedDrafts.some((x) => x.id === obj.activeDraftId) ? obj.activeDraftId : null;
        const sn = obj.stashedNew as {lines?: unknown; draft?: unknown} | null | undefined;
        const stashedNew = sn && typeof sn === 'object'
            ? {lines: Array.isArray(sn.lines) ? sn.lines.filter(isRequestLine) : [], draft: parseDraft(sn.draft)}
            : null;
        return {lines, draft: parseDraft(obj.draft), savedDrafts, activeDraftId, stashedNew};
    } catch {
        return EMPTY_STATE;
    }
}

function readRaw(): string | null {
    if (typeof window === 'undefined') return null;
    return window.localStorage.getItem(REQUEST_STORAGE_KEY);
}

function emit() {
    for (const listener of listeners) listener();
}

function parseSavedDrafts(value: unknown): SavedDraft[] {
    if (!Array.isArray(value)) return [];
    return value.flatMap((v): SavedDraft[] => {
        if (!v || typeof v !== 'object') return [];
        const o = v as {id?: unknown; savedAt?: unknown; draft?: unknown; lines?: unknown};
        if (typeof o.id !== 'string') return [];
        return [{
            id: o.id,
            savedAt: asString(o.savedAt, new Date(0).toISOString()),
            draft: parseDraft(o.draft),
            lines: Array.isArray(o.lines) ? o.lines.filter(isRequestLine) : [],
        }];
    });
}

function persist(next: RequestState): void {
    if (typeof window === 'undefined') return;
    // Most writers only pass {lines, draft}: keep the saved drafts unless given.
    const state: RequestState = {
        ...next,
        savedDrafts: next.savedDrafts ?? getRequestStateSnapshot().savedDrafts ?? [],
        activeDraftId: next.activeDraftId !== undefined ? next.activeDraftId : (getRequestStateSnapshot().activeDraftId ?? null),
        stashedNew: next.stashedNew !== undefined ? next.stashedNew : (getRequestStateSnapshot().stashedNew ?? null),
    };
    const raw = JSON.stringify(state);
    window.localStorage.setItem(REQUEST_STORAGE_KEY, raw);
    cachedRaw = raw;
    cachedState = state;
    emit();
}

export function getRequestStateSnapshot(): RequestState {
    const raw = readRaw();
    if (raw === cachedRaw) return cachedState;
    cachedRaw = raw;
    cachedState = parseState(raw);
    return cachedState;
}

export function getRequestStateServerSnapshot(): RequestState {
    return EMPTY_STATE;
}

/** @deprecated Prefer getRequestStateSnapshot().lines */
export function getRequestSnapshot(): RequestLine[] {
    return getRequestStateSnapshot().lines;
}

export function getRequestServerSnapshot(): RequestLine[] {
    return [];
}

export function subscribeRequest(onStoreChange: () => void): () => void {
    listeners.add(onStoreChange);
    if (typeof window !== 'undefined') {
        window.addEventListener('storage', onStoreChange);
    }
    return () => {
        listeners.delete(onStoreChange);
        if (typeof window !== 'undefined') {
            window.removeEventListener('storage', onStoreChange);
        }
    };
}

export function saveRequestState(state: RequestState): void {
    persist(state);
}

export function saveRequestLines(lines: RequestLine[]): void {
    const current = getRequestStateSnapshot();
    persist({...current, lines});
}

export function newId(fallbackPrefix: string): string {
    return typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `${fallbackPrefix}-${Date.now()}`;
}

export function createRequestLine(input: AddLineInput): RequestLine {
    const id = newId('line');
    return {
        id,
        productSlug: input.productSlug,
        ...(input.productTitle?.trim()
            ? {productTitle: input.productTitle.trim()}
            : {}),
        ...(input.productSku?.trim()
            ? {productSku: input.productSku.trim()}
            : {}),
        ...(input.productLineTitle?.trim()
            ? {productLineTitle: input.productLineTitle.trim()}
            : {}),
        ...(typeof input.productMoq === 'number' && input.productMoq > 0
            ? {productMoq: Math.round(input.productMoq)}
            : {}),
        ...(input.productMedia?.length ? {productMedia: input.productMedia} : {}),
        ...(input.availableCustomizations?.length
            ? {availableCustomizations: input.availableCustomizations}
            : {}),
        ...(input.customizationRules ? {customizationRules: input.customizationRules} : {}),
        ...(input.dimensionInput?.trim()
            ? {dimensionInput: input.dimensionInput.trim()}
            : {}),
        ...(input.dimensionRange
            ? {dimensionRange: input.dimensionRange}
            : {}),
        ...(input.printableSides?.length
            ? {printableSides: input.printableSides}
            : {}),
        quantities: [...input.quantities].filter((n) => n > 0).sort((a, b) => a - b),
        contents: input.contents.trim(),
        customizations: input.customizations,
        ...(input.customizationBuilder
            ? {customizationBuilder: input.customizationBuilder}
            : {}),
        ...(input.notes?.trim() ? {notes: input.notes.trim()} : {}),
        ...(input.referenceImages?.length
            ? {referenceImages: input.referenceImages}
            : {}),
        addedAt: new Date().toISOString(),
    };
}

export function addRequestLine(input: AddLineInput): RequestLine {
    const line = createRequestLine(input);
    const current = getRequestStateSnapshot();
    persist({
        lines: [...current.lines, line],
        draft: {
            ...current.draft,
            productsExpanded: true,
            express: current.draft.express,
        },
    });
    return line;
}

export function removeRequestLine(lineId: string): void {
    const current = getRequestStateSnapshot();
    persist({
        ...current,
        lines: current.lines.filter((line) => line.id !== lineId),
    });
}

/** Empties the Your Request pool. Draft fields are left alone. */
export function clearAllRequestLines(): void {
    const current = getRequestStateSnapshot();
    persist({
        lines: [],
        draft: {
            ...current.draft,
            productsExpanded: false,
            builderLineIds: null,
        },
    });
}

/**
 * After a successful submit: drop pool lines that were in the builder scope.
 * Unselected pool lines stay. Express (`builderLineIds: []`) removes nothing.
 * Clears `builderLineIds` so scope is not stale; leaves `submittedAt` / `ref`.
 */
export function consumeSubmittedRequestLines(): void {
    const current = getRequestStateSnapshot();
    const submitted = linesForBuilder(current.lines, current.draft);
    const removeIds = new Set(submitted.map((line) => line.id));
    const lines = current.lines.filter((line) => !removeIds.has(line.id));
    persist({
        lines,
        draft: {
            ...current.draft,
            builderLineIds: null,
            productsExpanded: lines.length > 0,
        },
    });
}

export type UpdateLinePatch = Partial<
    Pick<
        RequestLine,
        | 'contents'
        | 'notes'
        | 'referenceImages'
        | 'customizations'
        | 'customizationBuilder'
        | 'quantities'
    >
>;

export function updateRequestLine(
    lineId: string,
    patch: UpdateLinePatch,
): RequestLine | null {
    const current = getRequestStateSnapshot();
    let updated: RequestLine | null = null;
    const lines = current.lines.map((line) => {
        if (line.id !== lineId) return line;
        const next: RequestLine = {
            ...line,
            ...(patch.contents !== undefined
                ? {contents: patch.contents.trim()}
                : {}),
            ...(patch.quantities !== undefined
                ? {
                      quantities: [...patch.quantities]
                          .filter((n) => n > 0)
                          .sort((a, b) => a - b),
                  }
                : {}),
            ...(patch.customizations !== undefined
                ? {customizations: patch.customizations}
                : {}),
            ...(patch.customizationBuilder !== undefined
                ? {customizationBuilder: patch.customizationBuilder}
                : {}),
        };
        if (patch.notes !== undefined) {
            const trimmed = patch.notes.trim();
            if (trimmed) next.notes = trimmed;
            else delete next.notes;
        }
        if (patch.referenceImages !== undefined) {
            if (patch.referenceImages.length) {
                next.referenceImages = patch.referenceImages;
            } else {
                delete next.referenceImages;
            }
        }
        updated = next;
        return next;
    });
    if (!updated) return null;
    persist({...current, lines});
    return updated;
}

export function updateRequestDraft(patch: Partial<RequestDraft>): RequestDraft {
    const current = getRequestStateSnapshot();
    const draft = {...current.draft, ...patch};
    persist({...current, draft});
    return draft;
}

export function expandRequestProducts(): void {
    const current = getRequestStateSnapshot();
    updateRequestDraft({
        productsExpanded: true,
        builderLineIds: current.lines.map((line) => line.id),
    });
}

/** Clears everything the buyer typed and retires the lead id. Product lines in the pool survive. */
export function discardRequestDraft(): void {
    const current = getRequestStateSnapshot();
    persist({
        lines: current.lines,
        draft: {
            ...EMPTY_DRAFT,
            id: newId('draft'),
            productsExpanded: current.lines.length > 0,
        },
    });
}

/**
 * True when the buyer has typed nothing into the draft. Entry bookkeeping
 * (entryKind, express, productsExpanded, servicesEnabled, title) is set by the
 * route rather than the buyer, so it does not count as content.
 */
export function isDraftEmpty(draft: RequestDraft): boolean {
    return (
        draft.notes.trim() === '' &&
        draft.timeline.trim() === '' &&
        draft.packagingContents.trim() === '' &&
        draft.annualSpend.trim() === '' &&
        draft.contactFirstName.trim() === '' &&
        draft.contactLastName.trim() === '' &&
        draft.contactEmail.trim() === '' &&
        draft.contactPhone.trim() === '' &&
        draft.contactCompany.trim() === '' &&
        draft.contactIndustry.trim() === '' &&
        draft.expressQuantities.length === 0 &&
        draft.services.length === 0 &&
        draft.artworkNames.length === 0 &&
        draft.shippingAddress === null &&
        draft.companyAddress === null
    );
}

export function startExpressDraft(): void {
    const current = getRequestStateSnapshot();
    persist({
        lines: current.lines,
        draft: {
            ...EMPTY_DRAFT,
            id: newId('draft'),
            express: true,
            productsExpanded: false,
            entryKind: 'express',
            servicesEnabled: false,
            // Empty scope — pool lines stay in storage but stay off the brief
            // until the buyer chooses Include (expandRequestProducts).
            builderLineIds: [],
        },
    });
}

/**
 * Your Request → Request Builder: scope the draft to the selected pool lines.
 * Unselected lines stay in `lines` (the pool).
 */
export function startRequestFromSelection(selectedIds: string[]): void {
    const current = getRequestStateSnapshot();
    const idSet = new Set(selectedIds);
    const builderLineIds = current.lines
        .filter((line) => idSet.has(line.id))
        .map((line) => line.id);
    if (builderLineIds.length === 0) return;

    // Fresh answers each time; the selected products stay in the pool and this draft.
    persist({
        lines: current.lines,
        draft: {
            ...EMPTY_DRAFT,
            id: newId('draft'),
            builderLineIds,
            express: false,
            entryKind: 'products',
            productsExpanded: true,
            servicesEnabled: false,
            title: defaultDraftTitle(),
            submittedAt: null,
            ref: null,
        },
    });
}

/**
 * Start (or restart) a product / service / general intake with empty answers.
 * Pool lines stay; the previous lead's answers do not carry across.
 */
export function ensureBuilderDraft(
    opts?: {express?: boolean; mode?: RequestEntryKind},
): void {
    const current = getRequestStateSnapshot();
    const mode: RequestEntryKind =
        opts?.mode ??
        (opts?.express ? 'express' : 'products');

    if (mode === 'express') {
        startExpressDraft();
        return;
    }

    if (mode === 'services') {
        persist({
            lines: current.lines,
            draft: {
                ...EMPTY_DRAFT,
                id: newId('draft'),
                express: false,
                entryKind: 'services',
                productsExpanded: false,
                servicesEnabled: true,
                builderLineIds: null,
                title: defaultDraftTitle(),
                submittedAt: null,
                ref: null,
            },
        });
        return;
    }

    // products entry — empty answers; keep a Your Request selection scope if one was just set
    const keepScope =
        current.draft.entryKind === 'products' &&
        !current.draft.express &&
        Array.isArray(current.draft.builderLineIds) &&
        current.draft.builderLineIds.length > 0;
    persist({
        lines: current.lines,
        draft: {
            ...EMPTY_DRAFT,
            id: newId('draft'),
            express: false,
            entryKind: 'products',
            productsExpanded: true,
            servicesEnabled: false,
            builderLineIds: keepScope ? current.draft.builderLineIds : null,
            title: defaultDraftTitle(),
            submittedAt: null,
            ref: null,
        },
    });
}

export function defaultDraftTitle(date = new Date()): string {
    return `Draft quote request - ${date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    })}`;
}

/** Display name of a request tab. */
export function requestName(draft: RequestDraft): string {
    return draft.title || defaultDraftTitle();
}

/** The open draft's latest contents, written back into savedDrafts. */
function withActiveSynced(state: RequestState): SavedDraft[] {
    const list = state.savedDrafts ?? [];
    if (!state.activeDraftId) return list;
    return list.map((x) =>
        x.id === state.activeDraftId
            ? {...x, draft: {...state.draft, id: x.id}, lines: state.lines, savedAt: new Date().toISOString()}
            : x,
    );
}

/** The requests as tabs: New request first, then each draft (open one shows live counts). */
export function requestTabs(state: RequestState): {id: string | null; name: string; count: number}[] {
    const newCount = state.activeDraftId ? (state.stashedNew?.lines.length ?? 0) : state.lines.length;
    return [
        {id: null, name: 'New quote request', count: newCount},
        ...(state.savedDrafts ?? []).map((x) => ({
            id: x.id,
            name: x.id === state.activeDraftId ? requestName(state.draft) : requestName(x.draft),
            count: x.id === state.activeDraftId ? state.lines.length : x.lines.length,
        })),
    ];
}

/**
 * Switch the open request (R22 model B). The open one is put away (a draft
 * back into savedDrafts, the New request into stashedNew) and the target is
 * loaded into lines + draft, so everything that adds or submits acts on it.
 */
export function switchRequest(targetId: string | null): void {
    const current = getRequestStateSnapshot();
    if ((current.activeDraftId ?? null) === targetId) return;
    const savedDrafts = withActiveSynced(current);
    const stashedNew = current.activeDraftId ? (current.stashedNew ?? null) : {lines: current.lines, draft: current.draft};
    if (targetId === null) {
        const back = stashedNew ?? {lines: [], draft: {...EMPTY_DRAFT, id: newId('draft')}};
        persist({lines: back.lines, draft: back.draft, savedDrafts, activeDraftId: null, stashedNew: null});
        return;
    }
    const target = savedDrafts.find((x) => x.id === targetId);
    if (!target) return;
    persist({
        lines: target.lines,
        draft: {...target.draft, id: target.id, builderLineIds: null, productsExpanded: target.lines.length > 0},
        savedDrafts,
        activeDraftId: target.id,
        stashedNew,
    });
}

/**
 * "Save as draft" (R22): name the request in the brief and keep it as a tab.
 * From New request: the brief and the items in it become a new draft (the
 * rest stay in New request) and that draft becomes the open request. From an
 * open draft: it is already a tab; just keep its name and time.
 * Express (General brief) is a normal form: never saved. Returns the draft id.
 */
export function saveCurrentDraft(): string | null {
    const current = getRequestStateSnapshot();
    const d = current.draft;
    if (d.express || d.entryKind === 'express' || d.submittedAt) return null;
    if (current.activeDraftId) {
        persist({...current, draft: {...d, title: requestName(d)}, savedDrafts: withActiveSynced({...current, draft: {...d, title: requestName(d)}})});
        return current.activeDraftId;
    }
    const inBrief = linesForBuilder(current.lines, d);
    if (isDraftEmpty(d) && inBrief.length === 0) return null;
    const ids = new Set(inBrief.map((l) => l.id));
    const id = d.id;
    const saved: SavedDraft = {
        id,
        savedAt: new Date().toISOString(),
        draft: {...d, title: requestName(d), builderLineIds: null},
        lines: inBrief,
    };
    const rest = current.lines.filter((l) => !ids.has(l.id));
    persist({
        lines: saved.lines,
        draft: {...saved.draft, productsExpanded: saved.lines.length > 0},
        savedDrafts: [...(current.savedDrafts ?? []).filter((x) => x.id !== id), saved],
        activeDraftId: id,
        stashedNew: {lines: rest, draft: {...EMPTY_DRAFT, id: newId('draft'), productsExpanded: rest.length > 0}},
    });
    return id;
}

export function renameSavedDraft(id: string, title: string): void {
    const current = getRequestStateSnapshot();
    const t = title.trim();
    if (!t) return;
    persist({
        ...current,
        draft: current.activeDraftId === id ? {...current.draft, title: t} : current.draft,
        savedDrafts: (current.savedDrafts ?? []).map((x) => (x.id === id ? {...x, draft: {...x.draft, title: t}} : x)),
    });
}

/** Delete a draft; like Discard, its items go back to New request. */
export function deleteSavedDraft(id: string): void {
    if ((getRequestStateSnapshot().activeDraftId ?? null) === id) switchRequest(null);
    const current = getRequestStateSnapshot();
    const target = (current.savedDrafts ?? []).find((x) => x.id === id);
    if (!target) return;
    const merge = (into: RequestLine[]) => {
        const have = new Set(into.map((l) => l.id));
        return [...into, ...target.lines.filter((l) => !have.has(l.id))];
    };
    const savedDrafts = (current.savedDrafts ?? []).filter((x) => x.id !== id);
    if (current.activeDraftId) {
        const sn = current.stashedNew ?? {lines: [], draft: {...EMPTY_DRAFT, id: newId('draft')}};
        persist({...current, savedDrafts, stashedNew: {...sn, lines: merge(sn.lines)}});
    } else {
        persist({...current, lines: merge(current.lines), savedDrafts});
    }
}

/** After a draft is submitted it stops being a draft: drop its tab and reopen New request. */
export function settleSubmittedDraft(): void {
    const current = getRequestStateSnapshot();
    if (!current.activeDraftId || !current.draft.submittedAt) return;
    const id = current.activeDraftId;
    const back = current.stashedNew ?? {lines: [], draft: {...EMPTY_DRAFT, id: newId('draft')}};
    persist({
        lines: back.lines,
        draft: back.draft,
        savedDrafts: (current.savedDrafts ?? []).filter((x) => x.id !== id),
        activeDraftId: null,
        stashedNew: null,
    });
}
