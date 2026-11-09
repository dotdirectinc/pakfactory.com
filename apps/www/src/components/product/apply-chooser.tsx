'use client';

import {useState} from 'react';
import {Button} from '@pakfactory/ui/components/button';
import {CUSTOMIZATION_BUILDER_COPY} from '@/components/customization-builder/copy';
import {applyCompatibilityQuery} from '@/components/product/compatibility-preselect';
import {useProductPdpDraft} from '@/components/product/product-pdp-draft';
import {showToastCard} from '@/components/ui/toast-card';
import {REQUEST_COPY} from '@/lib/copy/request';
import {
    buildStepsFromCatalog,
    createEmptyBuilderState,
    resolvePrintableSides,
    toRequestCustomizations,
} from '@/lib/customization-builder';
import {useRequest} from '@/lib/request/request-provider';
import {WWW_ROUTES} from '@/lib/www-routes';

/**
 * PROD-3180: Apply chooser.
 *
 * Arriving from a customization page's "Apply to a product" on a product that
 * is ALREADY in the request used to start a second line (a near-duplicate).
 * Now the customer chooses: apply the option to the product already in the
 * request, or start a new line (keep configuring here as before).
 */
export function ApplyChooser() {
    const {lines, updateLine} = useRequest();
    const {product, compatibilityPreselect, clearCompatibilityPreselect, drawerPreselect} =
        useProductPdpDraft();
    const [dismissedFor, setDismissedFor] = useState<string | null>(null);

    const applied = compatibilityPreselect?.applied ?? [];
    const existing = lines.filter((line) => line.productSlug === product.slug);
    const key = `${product.slug}:${applied.join(',')}`;
    if (applied.length === 0 || existing.length === 0) return null;
    if (dismissedFor === key) return null;

    const target = existing[existing.length - 1]!;
    const options = applied.join(', ');

    function updateExisting() {
        const search = (drawerPreselect ?? window.location.search).replace(/^\?/, '');
        const base = target.customizationBuilder ?? createEmptyBuilderState();
        const result = applyCompatibilityQuery(
            product,
            base,
            new URLSearchParams(search),
        );
        if (!result) return;
        const printableSides = resolvePrintableSides(product.properties);
        updateLine(target.id, {
            customizationBuilder: result.state,
            customizations: toRequestCustomizations(
                result.state,
                CUSTOMIZATION_BUILDER_COPY.specialistToAdvise,
                buildStepsFromCatalog(product.availableCustomizations),
                printableSides,
            ),
        });
        setDismissedFor(key);
        clearCompatibilityPreselect();
        showToastCard({
            title: CUSTOMIZATION_BUILDER_COPY.applyChooserUpdated.replace(
                '{options}',
                options,
            ),
            action: {
                label: REQUEST_COPY.viewYourRequest,
                href: WWW_ROUTES.request,
            },
            dismissLabel: REQUEST_COPY.close,
        });
    }

    return (
        <div
            role="region"
            aria-label={CUSTOMIZATION_BUILDER_COPY.applyChooserTitle}
            className="mb-4 flex flex-col gap-3 rounded-xl border border-border bg-background p-4"
        >
            <p className="text-sm font-medium text-foreground">
                {CUSTOMIZATION_BUILDER_COPY.applyChooserTitle
                    .replace('{product}', product.title)}
            </p>
            <p className="text-xs text-muted-foreground">
                {CUSTOMIZATION_BUILDER_COPY.applyChooserBody.replace(
                    '{options}',
                    options,
                )}
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
                <Button type="button" className="flex-1" onClick={updateExisting}>
                    {CUSTOMIZATION_BUILDER_COPY.applyChooserUpdate}
                </Button>
                <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => setDismissedFor(key)}
                >
                    {CUSTOMIZATION_BUILDER_COPY.applyChooserNew}
                </Button>
            </div>
        </div>
    );
}
