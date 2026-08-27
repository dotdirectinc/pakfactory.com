/**
 * Temporary wiring aid for PROD-2398: prints the v1 submit payload to the
 * browser console when the buyer submits, so the endpoint can be built against
 * a real body before anything POSTs.
 *
 * Remove this once submit actually posts the payload.
 *
 * Development only. The payload carries buyer PII (email, phone, addresses),
 * which must never be written to a production console.
 */

import type {RequestDraft, RequestLine} from '@/lib/request/request.storage';
import {toSubmitPayload} from '@/lib/rfq/to-submit-payload';

export function logSubmitPayload(draft: RequestDraft, lines: RequestLine[]): void {
    if (process.env.NODE_ENV === 'production') return;

    const {payload, gaps} = toSubmitPayload(draft, lines);

    console.groupCollapsed(
        `[RFQ] submit payload v1 — source: ${payload.source}, lines: ${payload.lines.length}`,
    );
    console.log('payload (object):', payload);
    // Copy-pasteable body for curl / Postman while the endpoint is built.
    console.log('payload (JSON):\n' + JSON.stringify(payload, null, 2));
    if (gaps.length > 0) {
        console.warn(`${gaps.length} field(s) with no home in the v1 contract:`);
        console.table(gaps);
    }
    console.groupEnd();
}
