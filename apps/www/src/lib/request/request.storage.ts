import type {CustomizationOption} from '@/lib/catalog/types';

export const REQUEST_STORAGE_KEY = 'pakfactory.request.v1';

export type RequestCustomization = Pick<
    CustomizationOption,
    'id' | 'label' | 'category'
>;

export type RequestLine = {
    id: string;
    productSlug: string;
    quantities: number[];
    contents: string;
    customizations: RequestCustomization[];
    addedAt: string;
};

export type AddLineInput = {
    productSlug: string;
    quantities: number[];
    contents: string;
    customizations: RequestCustomization[];
};

const EMPTY_LINES: RequestLine[] = [];
const listeners = new Set<() => void>();

let cachedRaw: string | null | undefined;
let cachedLines: RequestLine[] = EMPTY_LINES;

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

function parseLines(raw: string | null): RequestLine[] {
    if (!raw) return EMPTY_LINES;
    try {
        const parsed: unknown = JSON.parse(raw);
        if (!Array.isArray(parsed)) return EMPTY_LINES;
        const lines = parsed.filter(isRequestLine);
        return lines.length ? lines : EMPTY_LINES;
    } catch {
        return EMPTY_LINES;
    }
}

function readRaw(): string | null {
    if (typeof window === 'undefined') return null;
    return window.localStorage.getItem(REQUEST_STORAGE_KEY);
}

function emit() {
    for (const listener of listeners) listener();
}

export function getRequestSnapshot(): RequestLine[] {
    const raw = readRaw();
    if (raw === cachedRaw) return cachedLines;
    cachedRaw = raw;
    cachedLines = parseLines(raw);
    return cachedLines;
}

export function getRequestServerSnapshot(): RequestLine[] {
    return EMPTY_LINES;
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

export function saveRequestLines(lines: RequestLine[]): void {
    if (typeof window === 'undefined') return;
    const raw = JSON.stringify(lines);
    window.localStorage.setItem(REQUEST_STORAGE_KEY, raw);
    cachedRaw = raw;
    cachedLines = lines;
    emit();
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
        addedAt: new Date().toISOString(),
    };
}

export function addRequestLine(input: AddLineInput): RequestLine {
    const line = createRequestLine(input);
    saveRequestLines([...getRequestSnapshot(), line]);
    return line;
}
