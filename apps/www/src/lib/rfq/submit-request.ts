'use server';

import type {RequestDraft, RequestLine} from '@/lib/request/request.storage';
import {
    canSubmitRequest,
    isContactReady,
    isContentsReady,
    isExpressQuantityReady,
    isNotesReady,
    isShippingReady,
} from '@/lib/request/validation';

export type SubmitRequestInput = {
    draft: RequestDraft;
    lines: RequestLine[];
};

export type SubmitRequestResult =
    | {ok: true; ref: string}
    | {ok: false; error: string};

function makeRef(): string {
    const n = Math.floor(10000 + Math.random() * 90000);
    return `RFQ-${n}`;
}

/**
 * Stub RFQ pipeline (PROD-2349). Stamps an RFQ reference locally.
 * Real Zoho / email / files land in PROD-2341.
 */
export async function submitRequest(
    input: SubmitRequestInput,
): Promise<SubmitRequestResult> {
    const {draft, lines} = input;

    if (!isNotesReady(draft)) {
        return {ok: false, error: 'Tell us what you\'re packaging before submitting.'};
    }
    if (!isContentsReady(draft, lines)) {
        return {ok: false, error: 'Say what you\'re packaging.'};
    }
    if (!isExpressQuantityReady(draft, lines)) {
        return {ok: false, error: 'Add a quantity in multiples of 100.'};
    }
    if (!isShippingReady(draft)) {
        return {ok: false, error: 'Add a shipping location.'};
    }
    if (!isContactReady(draft)) {
        return {ok: false, error: 'Add your name and work email.'};
    }
    if (!canSubmitRequest(draft, lines)) {
        return {ok: false, error: 'Finish required fields before submitting.'};
    }

    const ref = draft.ref?.match(/^RFQ-\d{5}$/) ? draft.ref : makeRef();
    return {ok: true, ref};
}
