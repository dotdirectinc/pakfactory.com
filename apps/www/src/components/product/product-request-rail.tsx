'use client';

import {useMemo, useState} from 'react';
import {AddToRequestButton} from '@/components/product/add-to-request-button';
import {ContentsField} from '@/components/product/contents-field';
import {CustomizationEntry} from '@/components/product/customization-entry';
import {QuantityPicker} from '@/components/product/quantity-picker';
import {showToastCard} from '@/components/ui/toast-card';
import type {CustomizationOption, Product} from '@/lib/catalog/types';
import {REQUEST_COPY} from '@/lib/copy/request';
import {useRequest} from '@/lib/request/request-provider';
import type {RequestReferenceImage} from '@/lib/request/request.storage';
import {WWW_ROUTES} from '@/lib/www-routes';

type ProductRequestRailProps = {
    product: Product;
};

export function ProductRequestRail({product}: ProductRequestRailProps) {
    const {addLine} = useRequest();
    const initialCustomizations = useMemo(
        () => (product.kind === 'inspiration' ? product.availableCustomizations : []),
        [product],
    );
    const [volumes, setVolumes] = useState<number[]>([]);
    const [contents, setContents] = useState('');
    const [detailsOptIn, setDetailsOptIn] = useState(false);
    const [notes, setNotes] = useState('');
    const [referenceImages, setReferenceImages] = useState<RequestReferenceImage[]>(
        [],
    );
    const [customizations] = useState<CustomizationOption[]>(initialCustomizations);

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
        addLine({
            productSlug: product.slug,
            quantities: volumes,
            contents,
            customizations,
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
                />
            </section>

            <section className="rounded-2xl bg-muted p-6">
                <CustomizationEntry applied={customizations} />
            </section>

            <AddToRequestButton disabled={!ready} onClick={handleAdd} />
        </div>
    );
}
