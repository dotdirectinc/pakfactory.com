'use client';

import {useMemo} from 'react';
import {cn} from '@pakfactory/ui/lib/utils';
import {ProductRequestCard} from '@/components/request/product-request-card';
import {ServicesUpsellToggle} from '@/components/request/services-upsell-toggle';
import {REQUEST_COPY} from '@/lib/copy/request';
import {useRequestLineAccordion} from '@/lib/request/use-request-line-accordion';
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
    /** Products-entry services upsell under the product list. */
    servicesEnabled?: boolean;
    onServicesEnabledChange?: (enabled: boolean) => void;
};

export function StepProducts({
    lines,
    draftId,
    onRemove,
    onUpdate,
    sectionRef,
    embedded = false,
    servicesEnabled,
    onServicesEnabledChange,
}: StepProductsProps) {
    const lineIds = useMemo(() => lines.map((line) => line.id), [lines]);
    const accordion = useRequestLineAccordion(lineIds);
    const showServicesUpsell =
        !embedded &&
        servicesEnabled !== undefined &&
        onServicesEnabledChange !== undefined;

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
                <p className="text-sm text-muted-foreground">
                    {REQUEST_COPY.noProductsYet}
                </p>
            ) : (
                <ul
                    className={cn(
                        accordion.collapsible ? 'space-y-3' : 'space-y-8',
                    )}
                >
                    {lines.map((line) => (
                        <ProductRequestCard
                            key={line.id}
                            line={line}
                            draftId={draftId}
                            onRemove={onRemove}
                            onUpdate={onUpdate}
                            collapsible={accordion.collapsible}
                            expanded={accordion.isExpanded(line.id)}
                            onExpandedChange={(open) =>
                                accordion.setExpanded(line.id, open)
                            }
                        />
                    ))}
                </ul>
            )}

            {showServicesUpsell ? (
                <ServicesUpsellToggle
                    className="mt-6"
                    checked={servicesEnabled}
                    onCheckedChange={onServicesEnabledChange}
                    title={REQUEST_COPY.servicesUpsellTitle}
                    description={REQUEST_COPY.servicesUpsellSupporting}
                />
            ) : null}
        </>
    );

    if (embedded) return <div className="space-y-4">{body}</div>;

    return (
        <section
            id="section-products"
            data-section="products"
            ref={sectionRef}
            className="pb-16"
        >
            {body}
        </section>
    );
}
