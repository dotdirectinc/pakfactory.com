'use client';

import {useCallback} from 'react';
import type {Dispatch, SetStateAction} from 'react';
import {presignAttachment} from '@/lib/rfq/presign-attachment';
import {newId, type RequestReferenceImage} from '@/lib/request/request.storage';

/**
 * Direct-to-S3 upload for the builder's reference images, shared by the two
 * places that pick files (`contents-field`, `request-line-card`).
 *
 * ── The flow, and why it is three hops ─────────────────────────────────────
 *   1. presign  — a server action, because the HMAC secret cannot reach the browser
 *   2. POST     — browser straight to S3, so bytes never traverse our API
 *   3. record   — keep the KEY on the draft; the submit payload carries it
 *
 * ── Why the state updates are functional ───────────────────────────────────
 * Uploads finish out of order, so every write is `setImages(prev => …)` keyed on
 * the item's id. Building a new array from a captured `images` value would let
 * two concurrent uploads each overwrite the other's result with a stale snapshot
 * — the classic version of this bug, and the reason this hook takes a React
 * setter rather than an array callback.
 */

export const MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024;

/** Mirrors the backend allowlist (ADR-0013 D2). SVG is absent deliberately: it is
 *  XML that can carry a script element. The signed policy enforces this list; the
 *  check here only spares the buyer a round trip and gives a better message. */
export const ALLOWED_CONTENT_TYPES = [
    'image/png',
    'image/jpeg',
    'image/webp',
    'image/gif',
    'application/pdf',
];

export function fileRejectionReason(file: File): string | null {
    if (!ALLOWED_CONTENT_TYPES.includes(file.type)) {
        return `${file.name} is not a supported file type.`;
    }
    if (file.size > MAX_ATTACHMENT_BYTES) {
        return `${file.name} is larger than 25MB.`;
    }
    if (file.size === 0) {
        return `${file.name} is empty.`;
    }
    return null;
}

export function useAttachmentUpload(
    draftId: string,
    setImages: Dispatch<SetStateAction<RequestReferenceImage[]>>,
) {
    return useCallback(
        async (files: File[]) => {
            for (const file of files) {
                const id = newId('ref');

                // Shown immediately, with a local preview. The blob URL is for the
                // thumbnail ONLY and never crosses the wire — what the backend gets
                // is the key, because a URL here is what ADR-0013 D3 rules out.
                const preview: RequestReferenceImage = {
                    id,
                    name: file.name,
                    url: URL.createObjectURL(file),
                    status: 'uploading',
                    bytes: file.size,
                };
                setImages((prev) => [...prev, preview]);

                const mark = (patch: Partial<RequestReferenceImage>) =>
                    setImages((prev) =>
                        prev.map((image) =>
                            image.id === id ? {...image, ...patch} : image,
                        ),
                    );

                const permit = await presignAttachment({
                    draftId,
                    filename: file.name,
                    contentType: file.type,
                    bytes: file.size,
                });
                if (!permit.ok) {
                    mark({status: 'error'});
                    continue;
                }

                // 🔴 The policy fields go in FIRST and the file part LAST. S3 reads
                // the multipart body in order and stops at the file, so a field
                // after it is never seen — the signature then fails on a request
                // that looks correct.
                const form = new FormData();
                for (const [k, v] of Object.entries(permit.fields)) form.append(k, v);
                form.append('file', file, file.name);

                try {
                    const res = await fetch(permit.url, {method: 'POST', body: form});
                    // S3 answers 204 with no body on success for a presigned POST.
                    mark(
                        res.ok
                            ? {status: 'uploaded', key: permit.key}
                            : {status: 'error'},
                    );
                } catch {
                    // Network, or a bucket whose CORS does not admit this origin —
                    // indistinguishable from the browser, which reports both as a
                    // failed fetch with no status.
                    mark({status: 'error'});
                }
            }
        },
        [draftId, setImages],
    );
}
