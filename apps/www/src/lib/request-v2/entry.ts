/**
 * RFQ v2 entry hints (prd-website-rfq-v2 §6). Doors inside the site pass their context with the
 * click (kept for this tab) and land on plain `/request`; links from outside use `?need=` (+ utm_*).
 * Hints are read once, when the request page opens. PORTABLE.
 */
export type EntryHints = {
    /** packaging / service (outside links: `?need=packaging,service`). */
    needs?: string[];
    /** The page or door the buyer came from (startedFrom, analytics). */
    from?: string;
    industry?: string;
    /** What they were looking at (style name) and its link. */
    reference?: string;
    referenceUrl?: string;
    /** Search words with no good match. */
    search?: string;
    /** A service to tick (Service detail page, later). */
    service?: string;
    utm?: Record<string, string>;
};

const KEY = 'pf_request_entry';
const NEEDS = ['packaging', 'service'];
/** URL params a door or outside link may carry; removed from the address once read. */
export const HINT_PARAMS = ['need', 'from', 'industry', 'q', 'ref', 'refUrl', 'service', 'question'];

/** A door saves its context for this tab, then links to /request. */
export function saveEntryHints(h: EntryHints): void {
    try {
        sessionStorage.setItem(KEY, JSON.stringify(h));
    } catch {
        /* storage blocked: the request starts blank */
    }
}

export function readUrlHints(params: URLSearchParams): EntryHints {
    const one = (k: string) => params.get(k)?.trim().slice(0, 200) || undefined;
    const needs = (one('need') ?? '').split(',').map((x) => x.trim()).filter((x) => NEEDS.includes(x));
    const utm: Record<string, string> = {};
    params.forEach((v, k) => {
        if (k.startsWith('utm_') && v) utm[k] = v.slice(0, 200);
    });
    const h: EntryHints = {};
    if (needs.length) h.needs = needs;
    const from = one('from');
    if (from) h.from = from;
    const industry = one('industry');
    if (industry) h.industry = industry;
    const reference = one('ref');
    if (reference) h.reference = reference;
    const referenceUrl = one('refUrl');
    if (referenceUrl?.startsWith('/')) h.referenceUrl = referenceUrl;
    const search = one('q');
    if (search) h.search = search;
    const service = one('service');
    if (service) h.service = service;
    if (Object.keys(utm).length) h.utm = utm;
    return h;
}

/** Hints for this visit: the door's (this tab) merged with the URL's; the door's are used once. */
export function takeEntryHints(params: URLSearchParams): EntryHints {
    let saved: EntryHints = {};
    try {
        const raw = sessionStorage.getItem(KEY);
        if (raw) saved = JSON.parse(raw) as EntryHints;
        sessionStorage.removeItem(KEY);
    } catch {
        /* storage blocked */
    }
    return {...saved, ...readUrlHints(params)};
}

export function hasHintParams(params: URLSearchParams): boolean {
    let found = false;
    params.forEach((_, k) => {
        if (HINT_PARAMS.includes(k) || k.startsWith('utm_') || k === 'draft') found = true;
    });
    return found;
}
