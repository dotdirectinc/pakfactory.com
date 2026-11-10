'use client';

import type {MouseEvent} from 'react';
import {usePathname} from 'next/navigation';
import {Bookmark, Columns2} from 'lucide-react';
import {Button} from '@pakfactory/ui/components/button';
import {Skeleton} from '@pakfactory/ui/components/skeleton';
import {cn} from '@pakfactory/ui/lib/utils';
import {CompareToggleLabel} from '@/components/compare/compare-toggle-label';
import {AddToRequestButton} from '@/components/product/add-to-request-button';
import {ApplyChooser} from '@/components/product/apply-chooser';
import {ContentsField} from '@/components/product/contents-field';
import {CustomizationEntry} from '@/components/product/customization-entry';
import {QuantityPicker} from '@/components/product/quantity-picker';
import {useProductPdpDraft} from '@/components/product/product-pdp-draft';
import {Icon} from '@/components/ui/icon';
import {OverviewSection} from '@/components/ui/overview-section';
import {runBookmarkToggle} from '@/lib/bookmarks/bookmark-actions';
import {useBookmarks} from '@/lib/bookmarks/bookmarks';
import {useBookmarkAuth} from '@/lib/bookmarks/use-bookmark-auth';
import {useCompareToggle} from '@/lib/compare/use-compare-toggle';
import {
    formatLeadTimeBusinessDays,
    PRODUCT_DETAIL_COPY,
} from '@/lib/copy/product-detail';
import {REQUEST_COPY} from '@/lib/copy/request';
import {resolvePrintableSides} from '@/lib/customization-builder';
import {productHref} from '@/lib/www-routes';

/**
 * PDP buy-box rail — quantity, customization, contents, Add to request + bookmark.
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
    const pathname = usePathname() || '/';
    const {canBookmark, loginHref} = useBookmarkAuth();
    const {isBookmarked} = useBookmarks();
    const saved = isBookmarked('product', product.slug);
    // R43 (PRD v4.6): Add to compare on the Product DP and Inspiration DP; groups by line (R44).
    const compareToggle = useCompareToggle({
        kind: 'product',
        id: product.slug,
        title: product.title,
        href: productHref(product.slug),
        imageUrl: product.media[0]?.src ?? null,
        groupKey: product.productLine.slug,
        groupLabel: product.productLine.title,
        styleTitle: product.productStyle?.title,
        inspiration: isInspiration,
        ...(product.sku ? {sku: product.sku} : {}),
    });
    const printableSides = resolvePrintableSides(product.properties);
    const leadTimeLabel = formatLeadTimeBusinessDays(
        product.leadTimeBusinessDaysMin,
        product.leadTimeBusinessDaysMax,
    );

    function handleBookmark(event: MouseEvent<HTMLButtonElement>) {
        runBookmarkToggle(
            event,
            {
                type: 'product',
                id: product.slug,
                snapshot: {
                    title: product.title,
                    href: productHref(product.slug),
                    imageUrl: product.media[0]?.src,
                    imageAlt: product.media[0]?.alt ?? product.title,
                    productLineSlug: product.productLine.slug,
                    productLineTitle: product.productLine.title,
                    ...(product.sku ? {sku: product.sku} : {}),
                    ...(product.moq != null ? {moq: product.moq} : {}),
                },
            },
            {allowed: canBookmark, loginHref: loginHref(pathname)},
        );
    }

    return (
        <div className="mt-8 space-y-6">
            <OverviewSection
                title={REQUEST_COPY.quantityLabel}
                description={PRODUCT_DETAIL_COPY.quantityHelper}
                required
            >
                <QuantityPicker
                    volumes={volumes}
                    onAdd={addVolume}
                    onRemove={removeVolume}
                    moq={product.moq ?? 500}
                />
                {leadTimeLabel ? (
                    <p className="mt-2 text-sm text-muted-foreground">
                        Lead time: {leadTimeLabel}
                    </p>
                ) : null}
            </OverviewSection>

            <OverviewSection>
                <ApplyChooser />
                <CustomizationEntry
                    availableCustomizations={product.availableCustomizations}
                    customizationRules={product.customizationRules}
                    builderState={builderState}
                    onBuilderStateChange={setBuilderState}
                    productTitle={product.title}
                    dimensionInput={product.dimensionInput}
                    dimensionRange={product.dimensionRange}
                    printableSides={printableSides}
                    preset={isInspiration}
                    compatibilityPreselect={compatibilityPreselect}
                    onClearCompatibilityPreselect={
                        clearCompatibilityPreselect
                    }
                    draftId={draftId}
                />
            </OverviewSection>

            <OverviewSection>
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
            </OverviewSection>

            <AddToRequestButton
                disabled={!ready}
                onClick={handleAdd}
                trailing={
                    <Button
                        type="button"
                        variant="outline"
                        aria-label={saved ? 'Bookmarked' : 'Bookmark product'}
                        aria-pressed={saved}
                        className="h-auto w-12 shrink-0 self-stretch px-0 shadow-none"
                        onClick={handleBookmark}
                    >
                        <Icon
                            icon={Bookmark}
                            size="sm"
                            className={cn(saved && 'fill-current')}
                        />
                    </Button>
                }
            />
            <Button
                type="button"
                variant="outline"
                className="group/cmp h-auto w-full px-6 py-3 text-base shadow-none"
                onClick={compareToggle.onClick}
                aria-pressed={compareToggle.inCompare}
            >
                <Icon icon={Columns2} size="sm" />
                <CompareToggleLabel inCompare={compareToggle.inCompare} />
            </Button>
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
                <OverviewSection key={index} aria-hidden>
                    <Skeleton className="h-5 w-28" />
                    <div className="mt-4 space-y-2">
                        <Skeleton className="h-10 w-full rounded-md" />
                        <Skeleton className="h-10 w-3/4 max-w-xs rounded-md" />
                    </div>
                </OverviewSection>
            ))}
            <div className="flex items-stretch gap-2" aria-hidden>
                <Skeleton className="h-12 min-w-0 flex-1 rounded-md" />
                <Skeleton className="h-12 w-12 shrink-0 rounded-md" />
            </div>
        </div>
    );
}
