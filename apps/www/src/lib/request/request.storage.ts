import type {CustomizationOption} from '@/lib/catalog/types';

export const REQUEST_STORAGE_KEY = 'pakfactory.request.v1';

export type RequestCustomization = Pick<
    CustomizationOption,
    'id' | 'label' | 'category'
>;

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

export type AddLineInput = {
    productSlug: string;
    quantities: number[];
    contents: string;
    customizations: RequestCustomization[];
    notes?: string;
    referenceImages?: RequestReferenceImage[];
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

export type RequestEntryKind = 'express' | 'products' | 'services';

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
    artworkNames: string[];
    submittedAt: string | null;
    ref: string | null;
};

export type RequestState = {
    lines: RequestLine[];
    draft: RequestDraft;
};

export const EMPTY_DRAFT: RequestDraft = {
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
    return (
        typeof line.id === 'string' &&
        typeof line.productSlug === 'string' &&
        Array.isArray(line.quantities) &&
        typeof line.contents === 'string' &&
        Array.isArray(line.customizations)
    );
}

function asString(value: unknown, fallback = ''): string {
    return typeof value === 'string' ? value : fallback;
}

function asBool(value: unknown, fallback = false): boolean {
    return typeof value === 'boolean' ? value : fallback;
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
        ...(typeof a.city === 'string' ? {city: a.city} : {}),
        ...(typeof a.region === 'string' ? {region: a.region} : {}),
        ...(typeof a.country === 'string' ? {country: a.country} : {}),
        ...(typeof a.postalCode === 'string' ? {postalCode: a.postalCode} : {}),
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
    if (!value || typeof value !== 'object') return {...EMPTY_DRAFT};
    const d = value as Partial<RequestDraft>;
    return {
        ...EMPTY_DRAFT,
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
        artworkNames: Array.isArray(d.artworkNames)
            ? d.artworkNames.filter((s): s is string => typeof s === 'string')
            : [],
        submittedAt:
            typeof d.submittedAt === 'string' || d.submittedAt === null
                ? d.submittedAt
                : null,
        ref: typeof d.ref === 'string' || d.ref === null ? d.ref : null,
    };
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
        const obj = parsed as {lines?: unknown; draft?: unknown};
        const lines = Array.isArray(obj.lines)
            ? obj.lines.filter(isRequestLine)
            : [];
        return {lines, draft: parseDraft(obj.draft)};
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

function persist(state: RequestState): void {
    if (typeof window === 'undefined') return;
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

export function createRequestLine(input: AddLineInput): RequestLine {
    const id =
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
            ? crypto.randomUUID()
            : `line-${Date.now()}`;
    return {
        id,
        productSlug: input.productSlug,
        quantities: [...input.quantities].filter((n) => n > 0).sort((a, b) => a - b),
        contents: input.contents.trim(),
        customizations: input.customizations,
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

export type UpdateLinePatch = Partial<
    Pick<
        RequestLine,
        | 'contents'
        | 'notes'
        | 'referenceImages'
        | 'customizations'
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
    updateRequestDraft({productsExpanded: true});
}

export function resetExpressDraft(): void {
    const current = getRequestStateSnapshot();
    persist({
        lines: current.lines,
        draft: {
            ...EMPTY_DRAFT,
            productsExpanded: current.lines.length > 0,
        },
    });
}

export function startExpressDraft(): void {
    const current = getRequestStateSnapshot();
    persist({
        lines: current.lines,
        draft: {
            ...EMPTY_DRAFT,
            express: true,
            productsExpanded: false,
            entryKind: 'express',
            servicesEnabled: false,
            title: defaultDraftTitle(),
        },
    });
}

export function ensureBuilderDraft(
    opts?: {express?: boolean; mode?: RequestEntryKind},
): void {
    const current = getRequestStateSnapshot();
    const mode: RequestEntryKind =
        opts?.mode ??
        (opts?.express ? 'express' : 'products');

    if (mode === 'express') {
        if (
            current.draft.entryKind !== 'express' ||
            !current.draft.express ||
            current.draft.submittedAt
        ) {
            startExpressDraft();
        }
        return;
    }

    if (mode === 'services') {
        const base = current.draft.submittedAt
            ? {...EMPTY_DRAFT}
            : {...current.draft};
        persist({
            lines: current.draft.submittedAt ? [] : current.lines,
            draft: {
                ...base,
                express: false,
                entryKind: 'services',
                productsExpanded: false,
                servicesEnabled: true,
                title: base.title || defaultDraftTitle(),
                submittedAt: null,
                ref: null,
            },
        });
        return;
    }

    // products entry
    persist({
        ...current,
        draft: {
            ...current.draft,
            express: false,
            entryKind: 'products',
            productsExpanded: true,
            servicesEnabled: current.draft.servicesEnabled,
            title: current.draft.title || defaultDraftTitle(),
            ...(current.draft.submittedAt
                ? {submittedAt: null, ref: null}
                : {}),
        },
    });
}

export function defaultDraftTitle(date = new Date()): string {
    return `Draft request - ${date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    })}`;
}
