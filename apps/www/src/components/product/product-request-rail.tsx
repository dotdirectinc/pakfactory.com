'use client';

import {useMemo, useState} from 'react';
import {AddToRequestButton} from '@/components/product/add-to-request-button';
import {ContentsField} from '@/components/product/contents-field';
import {CustomizationEntry} from '@/components/product/customization-entry';
import {QuantityPicker} from '@/components/product/quantity-picker';
import {CUSTOMIZATION_BUILDER_COPY} from '@/components/customization-builder/copy';
import {showToastCard} from '@/components/ui/toast-card';
import type {Product} from '@/lib/catalog/types';
import {REQUEST_COPY} from '@/lib/copy/request';
import {
    createEmptyBuilderState,
    buildStepsFromCatalog,
    seedFromCustomizations,
    toRequestCustomizations,
    type CustomizationBuilderState,
} from '@/lib/customization-builder';
import {useRequest} from '@/lib/request/request-provider';
import type {RequestReferenceImage} from '@/lib/request/request.storage';
import {WWW_ROUTES} from '@/lib/www-routes';

type ProductRequestRailProps = {
    product: Product;
};

export function ProductRequestRail({product}: ProductRequestRailProps) {
    const {addLine, draft} = useRequest();
    const initialBuilder = useMemo(() => {
        if (product.kind === 'inspiration' && product.availableCustomizations.length) {
            return seedFromCustomizations(product.availableCustomizations);
        }
        return createEmptyBuilderState();
    }, [product]);
    const [volumes, setVolumes] = useState<number[]>([]);
    const [contents, setContents] = useState('');
    const [detailsOptIn, setDetailsOptIn] = useState(false);
    const [notes, setNotes] = useState('');
    const [referenceImages, setReferenceImages] = useState<RequestReferenceImage[]>(
        [],
    );
    const [builderState, setBuilderState] =
        useState<CustomizationBuilderState>(initialBuilder);

    const contentsReady = Boolean(contents.trim());
    const ready = volumes.length > 0 && contentsReady;

    function addVolume(volume: number) {
        setVolumes((prev) =>
            prev.includes(volume) ? prev : [...prev, volume].sort((a, b) => a - b),
        );
    }

    function removeVolume(volume: number) {
        setVolumes((prev) => prev.filter((item) => item !== volume));
    }

    function handleAdd() {
        if (!ready) return;
        const customizations = toRequestCustomizations(
            builderState,
            CUSTOMIZATION_BUILDER_COPY.specialistToAdvise,
            buildStepsFromCatalog(product.availableCustomizations),
        );
        addLine({
            productSlug: product.slug,
            productTitle: product.title,
            productMedia: product.media,
            availableCustomizations: product.availableCustomizations,
            quantities: volumes,
            contents,
            customizations,
            customizationBuilder: builderState,
            ...(detailsOptIn && notes.trim() ? {notes} : {}),
            ...(detailsOptIn && referenceImages.length
                ? {referenceImages}
                : {}),
        });
        showToastCard({
            title: REQUEST_COPY.addedToYourRequest,
            action: {
                label: REQUEST_COPY.viewYourRequest,
                href: WWW_ROUTES.request,
            },
            dismissLabel: REQUEST_COPY.close,
        });
        setVolumes([]);
        setContents('');
        if (!detailsOptIn) {
            for (const image of referenceImages) {
                if (image.url.startsWith('blob:')) {
                    URL.revokeObjectURL(image.url);
                }
            }
        }
        setDetailsOptIn(false);
        setNotes('');
        setReferenceImages([]);
        setBuilderState(createEmptyBuilderState());
    }

    return (
        <div className="mt-8 space-y-6">
            <section className="rounded-2xl bg-muted p-6">
                <h2 className="text-base font-semibold text-brand-blue">
                    Quantity
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
                    draftId={draft.id}
                />
            </section>

            <section className="rounded-2xl bg-muted p-6">
                <CustomizationEntry
                    availableCustomizations={product.availableCustomizations}
                    builderState={builderState}
                    onBuilderStateChange={setBuilderState}
                    productTitle={product.title}
                />
            </section>

            <AddToRequestButton disabled={!ready} onClick={handleAdd} />
        </div>
    );
}
