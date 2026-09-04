'use server';

import {createHmac} from 'node:crypto';

/**
 * Mint a one-file upload permit so the browser can write straight to S3.
 *
 * Server-side only ('use server'), which is what lets SERVICE_SHARED_SECRET live
 * here at all — the same reason `submitRequest` is a server action. The permit it
 * returns IS safe to hand to the browser: that is the whole design (ADR-0013 D1).
 * Bytes never traverse our API, which caps JSON bodies at 1mb and runs on one
 * small box.
 *
 * ⚠️ The permit is not a general write token. The signed policy pins ONE key, ONE
 * content-type and a size range, so it cannot be redirected elsewhere in the
 * bucket or used to upload something else. It can, however, be replayed against
 * its own key until it expires — a buyer overwriting their own pending upload,
 * which is harmless here and worth knowing before anyone treats it as one-shot.
 */

const ENDPOINT_PATH = '/api/request/attachments/presign';

export type PresignResult =
    | {
          ok: true;
          url: string;
          fields: Record<string, string>;
          key: string;
      }
    | {ok: false; error: string};

const GENERIC_ERROR = 'That file could not be uploaded. Please try again.';

export async function presignAttachment(input: {
    draftId: string;
    filename: string;
    contentType: string;
    bytes: number;
}): Promise<PresignResult> {
    const baseUrl = process.env.BACKEND_API_BASE_URL;
    const secret = process.env.SERVICE_SHARED_SECRET;
    if (!baseUrl || !secret) {
        // Misconfiguration, not buyer error — say so in the log, not on screen.
        console.error(
            '[presignAttachment] BACKEND_API_BASE_URL / SERVICE_SHARED_SECRET missing.',
        );
        return {ok: false, error: GENERIC_ERROR};
    }

    // The signature covers the EXACT bytes sent, so the body is serialised once
    // and that same string is both signed and posted (ADR-0001 D3).
    const body = JSON.stringify(input);
    const ts = Math.floor(Date.now() / 1000).toString();
    const sig = createHmac('sha256', secret).update(`${ts}.${body}`).digest('hex');

    let res: Response;
    try {
        res = await fetch(`${baseUrl.replace(/\/$/, '')}${ENDPOINT_PATH}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-pf-timestamp': ts,
                'x-pf-signature': sig,
            },
            body,
            cache: 'no-store',
        });
    } catch (err) {
        console.error('[presignAttachment] backend unreachable', err);
        return {ok: false, error: GENERIC_ERROR};
    }

    if (!res.ok) {
        // 422 is a file the allowlist refuses or a size over the cap; 503 is an
        // unconfigured bucket. Neither is something the buyer can act on
        // differently, and the client already filters both before calling.
        console.error(`[presignAttachment] backend returned ${res.status}`);
        return {ok: false, error: GENERIC_ERROR};
    }

    const permit = (await res.json()) as {
        url?: string;
        fields?: Record<string, string>;
        key?: string;
    };
    if (!permit.url || !permit.fields || !permit.key) {
        return {ok: false, error: GENERIC_ERROR};
    }

    return {ok: true, url: permit.url, fields: permit.fields, key: permit.key};
}
