'use client';

import {REQUEST_COPY} from '@/lib/copy/request';

export function RequestDraftList() {
    return (
        <section className="mt-10" aria-labelledby="draft-requests-heading">
            <h2
                id="draft-requests-heading"
                className="text-lg font-semibold tracking-tight"
            >
                {REQUEST_COPY.draftRequestsHeading}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
                {REQUEST_COPY.draftRequestsEmpty}
            </p>
        </section>
    );
}
