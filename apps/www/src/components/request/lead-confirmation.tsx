'use client';

import {useEffect, useState} from 'react';
import {useRouter} from 'next/navigation';
import {RequestReviewPaper} from '@pakfactory/brief-builder-ui/request-review-paper';
import {useViewerTimeZone} from '@pakfactory/ui/components/local-time';
import {formatDateTime} from '@pakfactory/utilities/date-time';
import {LogoMark} from '@/components/layout/logo-mark';
import {RequestConfirmation} from '@/components/request/request-confirmation';
import {REQUEST_COPY} from '@/lib/copy/request';
import {requestEntryHref, type RequestFlow} from '@/lib/intake/routes';
import {RFQ_REF_PATTERN} from '@/lib/request/contract.rules';
import {useRequest} from '@/lib/request/request-provider';
import {getRequestReviewCopy} from '@/lib/request/request-review-copy';
import type {RequestLine} from '@/lib/request/request.storage';
import {resolveServiceLabel} from '@/lib/request/service-label';
import type {RequestServiceOption} from '@/lib/request/service-option';

/**
 * Confirmation at /request/{flow}/{leadId}/thank-you (R40, R30). Shown only to the browser that
 * submitted that lead; anyone else goes to the entry and sees nothing. Client only (see
 * lead-confirmation-entry): the draft lives in the browser. Shows the request as a paper with
 * its real reference (owner Nov 2: moved here from the review step).
 */
export function LeadConfirmation({
    flow,
    leadId,
    signedIn,
    serviceOptions = [],
}: {
    flow: RequestFlow;
    leadId: string;
    signedIn: boolean;
    serviceOptions?: RequestServiceOption[];
}) {
    const router = useRouter();
    const {draft} = useRequest();
    const owns = draft.id === leadId && Boolean(draft.submittedAt);
    const timeZone = useViewerTimeZone();
    // Products leave the pool on submit; the intake kept a copy for this paper (product request).
    const [lines] = useState<RequestLine[]>(() => {
        try {
            const raw = sessionStorage.getItem(`pf_submitted_lines:${leadId}`);
            return raw ? (JSON.parse(raw) as RequestLine[]) : [];
        } catch {
            return [];
        }
    });

    useEffect(() => {
        if (!owns) router.replace(requestEntryHref(flow));
    }, [owns, flow, router]);

    if (!owns) return null;
    const paper = (
        <RequestReviewPaper
            draft={draft}
            lines={lines}
            productTitle={(slug) => lines.find((l) => l.productSlug === slug)?.productTitle ?? slug}
            displayRef={draft.ref && RFQ_REF_PATTERN.test(draft.ref) ? draft.ref : REQUEST_COPY.refPlaceholder}
            documentDate={formatDateTime(new Date(draft.submittedAt ?? Date.now()), 'longDate', timeZone)}
            copy={getRequestReviewCopy()}
            logoSlot={<LogoMark className="size-9 shrink-0" />}
            mode="readonly"
            // Letter size (8.5 × 11), as on the one-page review: it reads as a document, not a card.
            className="sm:aspect-[8.5/11]"
            serviceLabel={(id) => resolveServiceLabel(id, serviceOptions, draft.serviceOther)}
        />
    );
    return <RequestConfirmation reference={draft.ref} signedIn={signedIn} express={flow !== 'product'} document={paper} />;
}
