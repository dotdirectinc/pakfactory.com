/**
 * Sectioned request: the one open request (decisions 1, 5, 6). `/request` opens it,
 * or starts one — a product request when items are waiting, otherwise a general one. Entry hints
 * fill what's still empty and never overwrite. PORTABLE.
 */
import {matchIndustry, prefillNotes, type GeneralBriefPrefill} from '@/lib/request/entry-prefill';
import {draftNeeds, NEED_SERVICE, needsPatch} from '@/lib/intake/needs';
import {
    getRequestStateSnapshot,
    startExpressDraft,
    startRequestFromSelection,
    updateRequestDraft,
    type RequestDraft,
} from '@/lib/request/request.storage';
import type {EntryHints} from '@/lib/request-sections/entry';

export type OpenRequest = {flow: 'product' | 'general'; id: string};

function openOf(draft: RequestDraft): OpenRequest | null {
    if (draft.submittedAt) return null;
    if (!draft.express && draft.entryKind === 'products' && draft.builderLineIds) return {flow: 'product', id: draft.id};
    if (draft.express && draft.entryKind === 'express') return {flow: 'general', id: draft.id};
    return null;
}

/** The open request, if one is in progress (not yet sent). */
export function openRequest(): OpenRequest | null {
    return openOf(getRequestStateSnapshot().draft);
}

/** @deprecated kept for older callers — the open product request's id. */
export function openProductRequestId(): string | null {
    const o = openRequest();
    return o?.flow === 'product' ? o.id : null;
}

function prefillOf(h: EntryHints): GeneralBriefPrefill {
    return {
        ...(h.industry ? {industry: h.industry} : {}),
        ...(h.reference ? {reference: h.reference} : {}),
        ...(h.referenceUrl ? {referenceUrl: h.referenceUrl} : {}),
        ...(h.search ? {search: h.search} : {}),
    };
}

/** Fill what's still empty from the hints; never untick or overwrite (the saved request wins). */
function applyHints(h: EntryHints): void {
    const {draft} = getRequestStateSnapshot();
    const patch: Partial<RequestDraft> = {};
    if (h.industry && !draft.contactIndustry) {
        const industry = matchIndustry(h.industry);
        if (industry) patch.contactIndustry = industry;
    }
    if (!draft.notes.trim()) {
        const notes = prefillNotes(prefillOf(h));
        if (notes) patch.notes = notes;
    }
    // The door knows the need: only when the buyer hasn't answered yet (general request).
    if (h.needs?.length && draft.express && !draft.needPicked && !draft.needFromDoor) {
        Object.assign(patch, needsPatch(h.needs), {needFromDoor: true, servicesEnabled: h.needs.includes(NEED_SERVICE)});
    }
    if (h.service && !draft.services.includes(h.service)) {
        const servicesOn = draft.express ? (patch.needs ?? draftNeeds(draft)).includes(NEED_SERVICE) : draft.servicesEnabled;
        if (servicesOn) patch.services = [...draft.services, h.service];
    }
    if (Object.keys(patch).length) updateRequestDraft(patch);
}

/*
 * One open request per kind (v0.4): the items request and the general request can both be in
 * progress. The draft store holds one at a time, so the other kind is parked here and swapped back
 * when its address opens. (Production: server-side drafts, one per kind — §7.)
 */
const PARKED_KEY = 'pf_request_parked';
type Parked = Partial<Record<'product' | 'general', RequestDraft>>;

function readParked(): Parked {
    try {
        return JSON.parse(window.localStorage.getItem(PARKED_KEY) ?? '{}') as Parked;
    } catch {
        return {};
    }
}
function writeParked(p: Parked): void {
    try {
        window.localStorage.setItem(PARKED_KEY, JSON.stringify(p));
    } catch {
        /* storage blocked: the other kind starts fresh next time */
    }
}

/**
 * In-tab general draft id. Step changes use history.replaceState → useSearchParams can
 * remount RequestHome; without this, ensureRequest would wipe the form mid-flow.
 * Cleared on Close / when opening a product request (true new visit starts fresh).
 */
let activeGeneralId: string | null = null;

/** Drop the in-tab general session (Close, or switching to a product request). */
export function releaseGeneralSession(): void {
    activeGeneralId = null;
}

/** Open this kind's request (swapping the other kind aside), or start one; then apply the visit's hints. */
export function ensureRequest(kind: 'product' | 'general', h: EntryHints): (OpenRequest & {resumed: boolean}) | null {
    // General: fresh on a real visit; resume the same draft if RequestHome remounts mid-flow.
    if (kind === 'general') {
        const open = openRequest();
        if (open?.flow === 'general' && activeGeneralId === open.id) {
            if (getRequestStateSnapshot().draft.shipToOptional) {
                updateRequestDraft({shipToOptional: false});
            }
            applyHints(h);
            return {...open, resumed: true};
        }
        const parked = readParked();
        if (open?.flow === 'product') parked.product = getRequestStateSnapshot().draft;
        delete parked.general;
        writeParked(parked);
        startExpressDraft();
        updateRequestDraft({shipToOptional: false, needPicked: false, needFromDoor: false});
        applyHints(h);
        const now = openRequest();
        activeGeneralId = now?.id ?? null;
        return now ? {...now, resumed: false} : null;
    }

    activeGeneralId = null;
    const open = openRequest();
    if (open && open.flow === kind) {
        // Sectioned Project summary requires ship-to — normalize resumes that still had it optional.
        if (getRequestStateSnapshot().draft.shipToOptional) {
            updateRequestDraft({stepIntake: true, shipToOptional: false});
        }
        applyHints(h);
        return {...open, resumed: true};
    }
    const parked = readParked();
    if (open) parked[open.flow] = getRequestStateSnapshot().draft;
    delete parked.general; // general is never resumed from the park
    const back = parked.product;
    delete parked.product;
    writeParked(parked);
    if (back && !back.submittedAt) {
        updateRequestDraft(back);
        applyHints(h);
        return {flow: 'product', id: back.id, resumed: true};
    }
    const {lines} = getRequestStateSnapshot();
    if (!lines.length) return null; // nothing to quote yet — the page shows the empty state
    startRequestFromSelection(lines.map((l) => l.id));
    // Sectioned request is a step intake; Project summary requires a shipping location.
    updateRequestDraft({stepIntake: true, shipToOptional: false});
    applyHints(h);
    const now = openRequest();
    return now ? {...now, resumed: false} : null;
}

/** `/request`: which kind to open — items first, then an open general request. */
export function defaultKind(): 'product' | 'general' {
    const open = openRequest();
    if (open?.flow === 'product' || getRequestStateSnapshot().lines.length) return 'product';
    return 'general';
}
