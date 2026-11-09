'use client';

import {useEffect, useState} from 'react';
import Link from 'next/link';
import {useRouter, useSearchParams} from 'next/navigation';
import {Button} from '@pakfactory/ui/components/button';
import {LeadConfirmation} from '@/components/request/lead-confirmation';
import {RequestConfirmation} from '@/components/request/request-confirmation';
import {RequestPageV2} from '@/components/request-v2/request-page';
import {RequestShell} from '@/components/request-v2/request-shell';
import type {IntakeContext} from '@/lib/intake/types';
import {useRequest} from '@/lib/request/request-provider';
import {getRequestStateSnapshot} from '@/lib/request/request.storage';
import type {RequestServiceOption} from '@/lib/request/service-option';
import {WWW_ROUTES} from '@/lib/www-routes';
import {hasHintParams, takeEntryHints} from '@/lib/request-v2/entry';
import {trackRequestOpen} from '@/lib/request-v2/events';
import {defaultKind, ensureRequest} from '@/lib/request-v2/start';
import {KIND_PATH, requestHref, stepFromParam, type RequestKind} from '@/lib/request-v2/url';

/**
 * RFQ v2 `/request/products` and `/request/general` (prd-website-rfq-v2 §5, v0.4): opens that kind's
 * request (the other kind is kept aside), or starts one, applies the visit's entry hints once, then
 * tidies the address to `?step=…`. `?draft={id}` resumes that request when it's this browser's;
 * otherwise says the link has expired. An items request with no items shows an empty state. PORTABLE.
 */
export function RequestHomeV2({
    kind,
    serviceOptions = [],
    rules = {},
}: {
    kind: RequestKind;
    serviceOptions?: RequestServiceOption[];
    rules?: IntakeContext['rules'];
}) {
    const router = useRouter();
    const params = useSearchParams();
    const {lines} = useRequest();
    const [state, setState] = useState<'pending' | 'ready' | 'expired' | 'empty'>('pending');
    useEffect(() => {
        const draftParam = params.get('draft');
        const current = getRequestStateSnapshot().draft;
        // Resume link for a request this browser doesn't hold (another device, or already sent).
        // POC: drafts live in the browser only; production loads it from the server by token (§7).
        if (draftParam && (draftParam !== current.id || current.submittedAt)) {
            setState('expired');
            return;
        }
        const hints = takeEntryHints(new URLSearchParams(params.toString()));
        const r = ensureRequest(kind, hints);
        if (!r) {
            setState('empty');
            return;
        }
        trackRequestOpen(r.flow, r.id, lines.length, r.resumed, hints.from);
        const rawStep = params.get('step');
        const step = stepFromParam(rawStep);
        // Tidy: drop entry hints; bare /request/products → ?step=items (Items always opens on entry).
        const tidyHints = hasHintParams(new URLSearchParams(params.toString()));
        const tidyItems = kind === 'product' && rawStep === null;
        if (tidyHints || tidyItems) {
            router.replace(requestHref(kind, step ?? (kind === 'product' ? 'products' : undefined)), {scroll: false});
        }
        setState('ready');
        // Once per visit to this kind.
    }, [kind]);
    if (state === 'pending') return null;
    if (state === 'expired' || state === 'empty') {
        const expired = state === 'expired';
        return (
            <RequestShell>
                <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-28 text-center">
                    <h1 className="text-2xl font-medium tracking-tight">{expired ? 'This link has expired' : 'No items yet'}</h1>
                    <p className="text-sm text-muted-foreground">
                        {expired
                            ? 'The request may already be sent, or it was started on another device. You can start a new one here.'
                            : 'Add products from the catalogue, or ask for a quote without picking products.'}
                    </p>
                    <div className="flex flex-wrap justify-center gap-2">
                        {expired ? (
                            <Button
                                type="button"
                                onClick={() => {
                                    router.replace(KIND_PATH[kind]);
                                    const r = ensureRequest(kind, {});
                                    if (r) trackRequestOpen(r.flow, r.id, lines.length, r.resumed, 'expired-link');
                                    setState(r ? 'ready' : 'empty');
                                }}
                            >
                                Start a new request
                            </Button>
                        ) : (
                            <>
                                <Button asChild variant="outline">
                                    <Link href={WWW_ROUTES.products}>Browse products</Link>
                                </Button>
                                <Button asChild>
                                    <Link href={KIND_PATH.general}>Get a Quote</Link>
                                </Button>
                            </>
                        )}
                    </div>
                </div>
            </RequestShell>
        );
    }
    return <RequestPageV2 serviceOptions={serviceOptions} rules={rules} />;
}

/** `/request` (the clipboard icon): opens the items request if there are items, else the general one. */
export function RequestRootV2() {
    const router = useRouter();
    useEffect(() => {
        router.replace(KIND_PATH[defaultKind()]);
    }, [router]);
    return null;
}

/**
 * RFQ v2 `/request/{products|general}/submitted?ref=…` (§5): the confirmation in the request's shell. The full
 * confirmation (with the request document) in the browser that sent it; elsewhere the reference.
 */
export function RequestSubmittedV2({
    reference,
    signedIn,
    serviceOptions = [],
}: {
    reference: string | null;
    signedIn: boolean;
    serviceOptions?: RequestServiceOption[];
}) {
    const {draft} = useRequest();
    const mine = Boolean(draft.submittedAt) && (!reference || draft.ref === reference);
    return (
        <RequestShell>
            {mine ? (
                <LeadConfirmation flow={draft.express ? 'general' : 'product'} leadId={draft.id} signedIn={signedIn} serviceOptions={serviceOptions} />
            ) : (
                <RequestConfirmation reference={reference} signedIn={signedIn} express={draft.express} />
            )}
        </RequestShell>
    );
}
