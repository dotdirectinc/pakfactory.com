'use client';

import {useRef, useState, useTransition} from 'react';
import {Button} from '@pakfactory/ui/components/button';
import {HoneypotField, MarketingOptIn, PrivacyLine} from '@/components/request/review-consent';
import {REQUEST_COPY} from '@/lib/copy/request';
import {trackFunnel} from '@/lib/request/funnel';
import type {RequestFlow} from '@/lib/intake/routes';
import type {RequestDraft, RequestLine} from '@/lib/request/request.storage';
import {serviceTitlesForIds} from '@/lib/request/service-label';
import type {RequestServiceOption} from '@/lib/request/service-option';
import {REQUEST_FORM_RULES} from '@/lib/request/request-rules';
import {submitRequest} from '@/lib/rfq/submit-request';

/**
 * Terminal CTA for the sectioned request under open Contact: marketing + privacy
 * on the left, Submit on the right (stacked on mobile). Not a fake third section.
 */
export function RequestSectionsSubmit({
    flow,
    lines,
    draft,
    onPatch,
    serviceOptions,
    onSubmitted,
    canSubmit,
}: {
    flow: RequestFlow;
    lines: RequestLine[];
    draft: RequestDraft;
    onPatch: (patch: Partial<RequestDraft>) => void;
    serviceOptions: RequestServiceOption[];
    onSubmitted: (ref: string) => void;
    canSubmit: boolean;
}) {
    const [error, setError] = useState('');
    const [pending, startTransition] = useTransition();
    const [honeypot, setHoneypot] = useState('');
    const openedAt = useRef(briefOpenedAt(draft.id));
    const rules = REQUEST_FORM_RULES;
    const submitDisabled = pending || !canSubmit;

    // Product request with the "Add services" switch off: services picked earlier are kept, not sent.
    const sendDraft = flow === 'product' && !draft.servicesEnabled ? {...draft, services: []} : draft;

    function submit() {
        setError('');
        trackFunnel('rfq_submit_click', {entry_kind: draft.entryKind, shell: 'sections'});
        startTransition(async () => {
            try {
                const result = await submitRequest({
                    draft: sendDraft,
                    lines,
                    rules,
                    botCheck: {honeypot, elapsedMs: Date.now() - openedAt.current},
                    serviceTitles: serviceTitlesForIds(sendDraft.services, serviceOptions, draft.serviceOther),
                });
                if (!result.ok) {
                    setError(result.error);
                    return;
                }
                onSubmitted(result.ref);
            } catch {
                setError(REQUEST_COPY.submitTransportError);
            }
        });
    }

    return (
        <div
            id="section-submit"
            className="flex flex-col gap-4 border-t border-border pt-10 pb-[max(2.5rem,env(safe-area-inset-bottom))] sm:flex-row sm:items-end sm:justify-between sm:gap-8"
        >
            <HoneypotField value={honeypot} onChange={setHoneypot} />
            <div className="order-1 flex min-w-0 flex-1 flex-col gap-2 sm:order-none">
                {error ? (
                    <p role="alert" className="text-sm text-destructive">
                        {error}
                    </p>
                ) : null}
                <MarketingOptIn compact optIn={Boolean(draft.marketingOptIn)} onOptInChange={(v) => onPatch({marketingOptIn: v})} />
                {/* pl-6 = checkbox (size-4) + gap-2 — aligns with “Email me…” */}
                <PrivacyLine className="pl-6" />
            </div>
            <Button
                type="button"
                size="xl"
                className="order-2 h-14 w-full shrink-0 px-10 text-lg sm:order-none sm:w-auto"
                disabled={submitDisabled}
                onClick={submit}
            >
                {pending ? REQUEST_COPY.submitting : REQUEST_COPY.requestAQuote}
            </Button>
        </div>
    );
}

function briefOpenedAt(draftId: string): number {
    try {
        const v = Number(sessionStorage.getItem(`pf_brief_opened:${draftId}`));
        return v > 0 ? v : Date.now();
    } catch {
        return Date.now();
    }
}
