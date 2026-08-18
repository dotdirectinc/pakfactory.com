'use client';

import {useMemo, useState} from 'react';
import Link from 'next/link';
import {toast} from 'sonner';
import {Button} from '@pakfactory/ui/components/button';
import {AddToRequestButton} from '@/components/product/add-to-request-button';
import {ContentsField} from '@/components/product/contents-field';
import {CustomizationEntry} from '@/components/product/customization-entry';
import {QuantityPicker} from '@/components/product/quantity-picker';
import type {CustomizationOption, Product} from '@/lib/catalog/types';
import {REQUEST_COPY} from '@/lib/copy/request';
import {useRequest} from '@/lib/request/request-provider';
import {WWW_ROUTES} from '@/lib/www-routes';

type ProductRequestRailProps = {
    product: Product;
};

type Confirmation = {
    productTitle: string;
    quantities: number[];
    customizations: CustomizationOption[];
};

function formatVolumes(volumes: number[]): string {
    return volumes.map((n) => n.toLocaleString('en-US')).join(', ');
}

export function ProductRequestRail({product}: ProductRequestRailProps) {
    const {addLine} = useRequest();
    const initialCustomizations = useMemo(
        () => (product.kind === 'inspiration' ? product.availableCustomizations : []),
        [product],
    );
    const [volumes, setVolumes] = useState<number[]>([]);
    const [contents, setContents] = useState('');
    const [customizations] = useState<CustomizationOption[]>(initialCustomizations);
    const [confirmation, setConfirmation] = useState<Confirmation | null>(null);

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
        });
        const nextConfirmation = {
            productTitle: product.title,
            quantities: volumes,
            customizations,
        };
        setConfirmation(nextConfirmation);
        toast(REQUEST_COPY.addedToYourRequest, {
            description: `${product.title} · ${formatVolumes(volumes)} units`,
            action: {
                label: REQUEST_COPY.viewYourRequest,
                onClick: () => {
                    window.location.assign(WWW_ROUTES.request);
                },
            },
        });
        setVolumes([]);
        setContents('');
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
                />
            </section>

            <section className="rounded-2xl bg-muted p-6">
                <CustomizationEntry applied={customizations} />
            </section>

            <AddToRequestButton disabled={!ready} onClick={handleAdd} />

            {confirmation ? (
                <div
                    className="rounded-2xl border border-border bg-background p-6"
                    role="status"
                >
                    <p className="text-sm font-semibold">
                        {REQUEST_COPY.addedToYourRequest}
                    </p>
                    <dl className="mt-3 space-y-1 text-sm">
                        <div className="flex gap-2">
                            <dt className="text-muted-foreground">Product</dt>
                            <dd>{confirmation.productTitle}</dd>
                        </div>
                        <div className="flex gap-2">
                            <dt className="text-muted-foreground">Quantity</dt>
                            <dd>{formatVolumes(confirmation.quantities)} units</dd>
                        </div>
                        <div className="flex gap-2">
                            <dt className="text-muted-foreground">Customizations</dt>
                            <dd>
                                {confirmation.customizations.length
                                    ? confirmation.customizations
                                          .map((item) => item.label)
                                          .join(', ')
                                    : 'None'}
                            </dd>
                        </div>
                    </dl>
                    <Button asChild variant="link" className="mt-2 h-auto px-0">
                        <Link href={WWW_ROUTES.request}>
                            {REQUEST_COPY.viewYourRequest}
                        </Link>
                    </Button>
                </div>
            ) : null}
        </div>
    );
}
