'use client';

import {ProductRequestCard} from '@/components/request/product-request-card';
import {RequestAddProducts} from '@/components/request/request-add-products';
import {REQUEST_COPY} from '@/lib/copy/request';
import type {
    RequestLine,
    UpdateLinePatch,
} from '@/lib/request/request.storage';

type StepProductsProps = {
    lines: RequestLine[];
    draftId: string;
    onRemove: (lineId: string) => void;
    onUpdate: (lineId: string, patch: UpdateLinePatch) => void;
    sectionRef?: React.Ref<HTMLElement>;
    /** Skip outer section + title (services-entry products upsell). */
    embedded?: boolean;
};

export function StepProducts({
    lines,
    draftId,
    onRemove,
    onUpdate,
    sectionRef,
    embedded = false,
}: StepProductsProps) {
    const body = (
        <>
            {embedded ? null : (
                <div className="mb-7">
                    <h2 className="text-2xl font-semibold tracking-tight">
                        {REQUEST_COPY.productsTitle}
                    </h2>
                    <p className="mt-2 text-sm text-muted-foreground">
                        {REQUEST_COPY.productsSubtitle}
                    </p>
                </div>
            )}

            {lines.length === 0 ? (
                <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                        {REQUEST_COPY.noProductsYet}
                    </p>
                    <RequestAddProducts variant="empty" />
                </div>
            ) : (
                <>
                    <ul className="space-y-3">
                        {lines.map((line) => (
                            <ProductRequestCard
                                key={line.id}
                                line={line}
                                draftId={draftId}
                                onRemove={onRemove}
                                onUpdate={onUpdate}
                            />
                        ))}
                    </ul>
                    <RequestAddProducts variant="more" className="mt-4" />
                </>
            )}
        </>
    );

    if (embedded) return <div className="space-y-4">{body}</div>;

    return (
        <section
            id="section-products"
            data-section="products"
            ref={sectionRef}
            className="border-t border-border/60 py-16"
        >
            {body}
        </section>
    );
}
