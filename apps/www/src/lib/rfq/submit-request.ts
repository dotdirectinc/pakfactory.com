'use server';

import {createHmac, randomUUID} from 'node:crypto';
import {headers} from 'next/headers';

import type {RequestDraft, RequestLine} from '@/lib/request/request.storage';
import {
    canSubmitRequest,
    isContactReady,
    isContentsReady,
    isExpressQuantityReady,
    isNotesReady,
    isShippingReady,
} from '@/lib/request/validation';
import {toWireSubmission} from '@/lib/rfq/to-wire-payload';
import {getUser} from '@pakfactory/supabase/session';

export type SubmitRequestInput = {
    draft: RequestDraft;
    lines: RequestLine[];
};

export type SubmitRequestResult =
    | {ok: true; ref: string}
    | {ok: false; error: string};

/**
 * The BFF hop: buyer → this server action → signed POST /api/request → backend.
 *
 * This replaces a stub that stamped `RFQ-${Math.random()}` locally and returned.
 * That reference was never persisted and collided at roughly 1% by the fortieth
 * request; ADR-0012 D4 puts minting in the backend, from a Postgres sequence.
 *
 * Server-side only ('use server'), which is what lets the shared secret live
 * here at all — it must never reach the browser bundle.
 */

const ENDPOINT_PATH = '/api/request';

/** Signed service-to-service auth (ADR-0001 D3):
 *      x-pf-signature: hex( HMAC-SHA256( secret, `${timestamp}.${rawBody}` ) )
 *  The signature covers the EXACT bytes sent, so the body is serialised once
 *  and that same string is both signed and posted. */
function sign(body: string, secret: string) {
    const ts = Math.floor(Date.now() / 1000).toString();
    return {ts, sig: createHmac('sha256', secret).update(`${ts}.${body}`).digest('hex')};
}

/**
 * The buyer's IP, forwarded explicitly (ADR-0012 D11).
 *
 * ⚠️ Forwarding is necessary but NOT sufficient. The backend resolves `req.ip`
 * from X-Forwarded-For under `trust proxy: 'loopback'`, and nginx appends this
 * process's own address — which is not loopback, so Express stops there and the
 * buyer's ip is ignored no matter what we send. Until the backend widens its
 * trusted hop, its per-IP limiter is a single global bucket for every buyer on
 * the site. Sending the header is this side's half of the fix.
 */
async function clientIp(): Promise<string | null> {
    const h = await headers();
    const forwarded = h.get('x-forwarded-for');
    // Leftmost is the original client; the rest are proxies that appended.
    const first = forwarded?.split(',')[0]?.trim();
    return first || h.get('x-real-ip') || null;
}

/** Copy for a failure the buyer can act on, versus one only we can. */
const GENERIC_ERROR =
    'Something went wrong submitting your request. Please try again in a moment.';

export async function submitRequest(
    input: SubmitRequestInput,
): Promise<SubmitRequestResult> {
    const {draft, lines} = input;

    // Client-side gate first, so an incomplete draft never becomes a network
    // round trip. These messages name the specific field; the server's 422s are
    // still the authority, and are surfaced below when the two disagree.
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

    const baseUrl = process.env.BACKEND_API_BASE_URL;
    const secret = process.env.SERVICE_SHARED_SECRET;
    if (!baseUrl || !secret) {
        // Misconfiguration, not buyer error — say so in the log, not on screen.
        console.error(
            '[submitRequest] BACKEND_API_BASE_URL / SERVICE_SHARED_SECRET missing; cannot submit.',
        );
        return {ok: false, error: GENERIC_ERROR};
    }

    // Minted per CLICK. A retry of THIS call carries the same id and collapses
    // server-side; a buyer who edits and resubmits gets a new one and a second
    // RFQ, which is sales' call to judge, not ours (ADR-0012 D10).
    const submissionId = randomUUID();

    // 🔴 Read from the SESSION here, never taken from the client. This is the
    // whole of what ADR-0012 D1 means by "identified by the BFF": the browser
    // cannot reach the backend at all (HMAC gates it), so the id can only come
    // from a server action that has already verified the session cookie.
    //
    // A guest submits with no id and that is the normal path — their
    // confirmation email is their record, and history is an account feature
    // (decided 2026-09-04). Failing to read the session must NOT fail the
    // submit: a buyer who is signed in but whose session lookup errors should
    // still get their request in, as a guest would.
    let customerId: string | undefined;
    try {
        customerId = (await getUser())?.id;
    } catch (err) {
        console.error('[submitRequest] session lookup failed; submitting as guest', err);
    }

    const wire = toWireSubmission(draft, lines, submissionId);
    const body = JSON.stringify(
        customerId ? {...wire, customerId} : wire,
    );
    const {ts, sig} = sign(body, secret);
    const ip = await clientIp();

    let res: Response;
    try {
        res = await fetch(`${baseUrl.replace(/\/$/, '')}${ENDPOINT_PATH}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-pf-timestamp': ts,
                'x-pf-signature': sig,
                ...(ip ? {'X-Forwarded-For': ip} : {}),
            },
            body,
            cache: 'no-store',
        });
    } catch (err) {
        console.error('[submitRequest] transport error', err);
        return {ok: false, error: GENERIC_ERROR};
    }

    if (res.ok) {
        const json = (await res.json()) as {reference?: string};
        if (!json.reference) {
            console.error('[submitRequest] 200 with no reference', json);
            return {ok: false, error: GENERIC_ERROR};
        }
        return {ok: true, ref: json.reference};
    }

    // 422 means the client gate and the server contract disagree — a defect on
    // our side, not the buyer's. Log the field errors so the divergence is
    // findable, and show the first message, which names an actual field.
    if (res.status === 422) {
        const json = (await res.json().catch(() => null)) as
            | {errors?: {field: string; message: string}[]}
            | null;
        console.error('[submitRequest] 422 — client gate and server contract disagree', json?.errors);
        const first = json?.errors?.[0]?.message;
        return {ok: false, error: first ?? GENERIC_ERROR};
    }

    if (res.status === 429) {
        return {
            ok: false,
            error: 'Too many requests just now. Please wait a moment and try again.',
        };
    }

    // 401 is a signing/clock failure between two of our own services; the buyer
    // can do nothing about it and should not be told to try a different input.
    console.error(`[submitRequest] backend responded ${res.status}`);
    return {ok: false, error: GENERIC_ERROR};
}
