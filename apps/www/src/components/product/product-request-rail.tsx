'use client';

import {Skeleton} from '@pakfactory/ui/components/skeleton';
import {AddToRequestButton} from '@/components/product/add-to-request-button';
import {CompatibilityPreselectBanner} from '@/components/product/compatibility-preselect';
import {ContentsField} from '@/components/product/contents-field';
import {CustomizationEntry} from '@/components/product/customization-entry';
import {QuantityPicker} from '@/components/product/quantity-picker';
import {useProductPdpDraft} from '@/components/product/product-pdp-draft';
import {REQUEST_COPY} from '@/lib/copy/request';

/**
 * PDP buy-box rail — quantity, contents, customization, Add to request.
 * Draft state lives in {@link ProductPdpDraftProvider} (page-level sticky bar).
 */
export function ProductRequestRail() {
    const {
        product,
        volumes,
        contents,
        detailsOptIn,
        notes,
        referenceImages,
        builderState,
        draftId,
        ready,
        compatibilityPreselect,
        clearCompatibilityPreselect,
        addVolume,
        removeVolume,
        setContents,
        setDetailsOptIn,
        setNotes,
        setReferenceImages,
        setBuilderState,
        handleAdd,
    } = useProductPdpDraft();
    const isInspiration = product.kind === 'inspiration';

    return (
        <div className="mt-8 space-y-6">
            <CompatibilityPreselectBanner
                notice={compatibilityPreselect}
                onClear={clearCompatibilityPreselect}
            />
            <section className="rounded-2xl bg-muted p-6">
                <h2 className="text-base font-semibold text-brand-blue">
                    {REQUEST_COPY.quantityLabel}
                    <span className="text-destructive" aria-hidden>
                        {' '}
                        *
                    </span>
                </h2>
                <QuantityPicker
                    className="mt-4"
                    volumes={volumes}
                    onAdd={addVolume}
                    onRemove={removeVolume}
                    moq={product.moq ?? 500}
                />
            </section>

            <section className="rounded-2xl bg-muted p-6">
                <ContentsField
                    id={`contents-${product.slug}`}
                    value={contents}
                    onChange={setContents}
                    detailsOptIn={detailsOptIn}
                    onDetailsOptInChange={setDetailsOptIn}
                    notes={notes}
                    onNotesChange={setNotes}
                    referenceImages={referenceImages}
                    onReferenceImagesChange={setReferenceImages}
                    draftId={draftId}
                />
            </section>

            <section className="rounded-2xl bg-muted p-6">
                <CustomizationEntry
                    availableCustomizations={product.availableCustomizations}
                    customizationRules={product.customizationRules}
                    builderState={builderState}
                    onBuilderStateChange={setBuilderState}
                    productTitle={product.title}
                    dimensionInput={product.dimensionInput}
                    dimensionRange={product.dimensionRange}
                    preset={isInspiration}
                />
            </section>

            <AddToRequestButton disabled={!ready} onClick={handleAdd} />
        </div>
    );
}

/**
 * Loading chrome for {@link ProductRequestRail} — same muted section wells
 * and spacing as the live quantity / contents / customization rail.
 */
export function ProductRequestRailSkeleton() {
    return (
        <div
            className="mt-8 space-y-6"
            aria-busy="true"
            aria-live="polite"
        >
            <span className="sr-only">Loading request options</span>
            {Array.from({length: 3}, (_, index) => (
                <section
                    key={index}
                    className="rounded-2xl bg-muted p-6"
                    aria-hidden
                >
                    <Skeleton className="h-5 w-28" />
                    <div className="mt-4 space-y-2">
                        <Skeleton className="h-10 w-full rounded-md" />
                        <Skeleton className="h-10 w-3/4 max-w-xs rounded-md" />
                    </div>
                </section>
            ))}
            <div className="space-y-2" aria-hidden>
                <Skeleton className="h-12 w-full rounded-md" />
                <Skeleton className="mx-auto h-3 w-40" />
            </div>
        </div>
    );
}
