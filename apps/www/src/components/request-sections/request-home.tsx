'use client';

import {useEffect, useState} from 'react';
import Link from 'next/link';
import {useRouter, useSearchParams} from 'next/navigation';
import {Button} from '@pakfactory/ui/components/button';
import {LeadConfirmation} from '@/components/request/lead-confirmation';
import {RequestConfirmation} from '@/components/request/request-confirmation';
import {RequestPage} from '@/components/request-sections/request-page';
import {RequestShell} from '@/components/request-sections/request-shell';
import type {IntakeContext} from '@/lib/intake/types';
import {useRequest} from '@/lib/request/request-provider';
import {getRequestStateSnapshot} from '@/lib/request/request.storage';
import type {RequestServiceOption} from '@/lib/request/service-option';
import {WWW_ROUTES} from '@/lib/www-routes';
import {toolShellReturnHref} from '@/lib/ui/tool-shell-return';
import {hasHintParams, takeEntryHints} from '@/lib/request-sections/entry';
import {trackRequestOpen} from '@/lib/request-sections/events';
import {defaultKind, ensureRequest} from '@/lib/request-sections/start';
import {KIND_PATH, requestHref, type RequestKind} from '@/lib/request-sections/url';

/**
 * Sectioned `/request/products` and `/request/general`: opens that kind's
 * request (the other kind is kept aside), or starts one, applies the visit's entry hints once, then
 * tidies the address (bare kind path — no `?step=`). `?draft={id}` resumes that request when it's
 * this browser's; otherwise says the link has expired. An items request with no items shows an empty
 * state. PORTABLE.
 */
export function RequestHome({
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
        const sp = new URLSearchParams(params.toString());
        const tidyHints = hasHintParams(sp);
        const bare = requestHref(kind);
        // Drop door hints via Next (needed so takeEntryHints is not re-read). Strip legacy ?step=
        // with History API so useSearchParams does not remount this page.
        if (tidyHints) {
            router.replace(bare, {scroll: false});
        } else if (sp.has('step')) {
            window.history.replaceState(window.history.state, '', bare);
        }
        setState('ready');
        // Once per visit to this kind.
    }, [kind]);
    // Client-only entry: paint the shell while localStorage is read (avoid a blank page).
    if (state === 'pending') return <RequestShell />;
    if (state === 'expired' || state === 'empty') {
        const expired = state === 'expired';
        return (
            <RequestShell>
                <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-28 text-center animate-page-enter motion-reduce:animate-none">
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
    return <RequestPage serviceOptions={serviceOptions} rules={rules} />;
}

/** `/request` (the clipboard icon): opens the items request if there are items, else the general one. */
export function RequestRoot() {
    const router = useRouter();
    useEffect(() => {
        router.replace(KIND_PATH[defaultKind()]);
    }, [router]);
    // Shell while redirecting — this route is under the request group, so no site footer flash.
    return <RequestShell />;
}

/**
 * Sectioned `/request/{products|general}/submitted?ref=…`: the confirmation in the request's shell. The full
 * confirmation (with the request document) in the browser that sent it; elsewhere the reference.
 */
export function RequestSubmitted({
    reference,
    signedIn,
    serviceOptions = [],
}: {
    reference: string | null;
    signedIn: boolean;
    serviceOptions?: RequestServiceOption[];
}) {
    const router = useRouter();
    const {draft} = useRequest();
    const mine = Boolean(draft.submittedAt) && (!reference || draft.ref === reference);
    // After submit, do not history.back() onto the form — push the remembered site page (or home).
    const leaveSubmitted = () => {
        router.push(toolShellReturnHref() ?? WWW_ROUTES.home);
    };
    return (
        <RequestShell onClose={leaveSubmitted}>
            {mine ? (
                <LeadConfirmation flow={draft.express ? 'general' : 'product'} leadId={draft.id} signedIn={signedIn} serviceOptions={serviceOptions} />
            ) : (
                <RequestConfirmation reference={reference} signedIn={signedIn} express={draft.express} />
            )}
        </RequestShell>
    );
}
