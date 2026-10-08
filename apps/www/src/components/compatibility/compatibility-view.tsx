import {CompatibilityCopyLinkButton} from '@/components/compatibility/compatibility-copy-link-button';
import {CompatibilityHeroMedia} from '@/components/compatibility/compatibility-hero-media';
import {CompatibilitySelectionBar} from '@/components/compatibility/compatibility-selection-bar';
import {PageBreadcrumbSection} from '@/components/common/page-breadcrumb-section';
import {PageHeadingWithMedia} from '@/components/common/page-heading-section';
import {ProductCatalogView} from '@/components/product/product-catalog-view';
import type {CompatibilityPageModel} from '@/lib/catalog/build-compatibility-page';
import type {CompatibilityQuery} from '@/lib/catalog/compatibility-query';
import {WWW_ROUTES} from '@/lib/www-routes';

type CompatibilityViewProps = {
    model: CompatibilityPageModel;
    /** Breadcrumb trail after Customizations (default: Compatibility). */
    breadcrumbTail?: {label: string; href?: string}[];
    onQueryChange: (next: CompatibilityQuery) => void;
};

/**
 * Compatibility page chrome + prefiltered product catalog (PROD-2921).
 * Same composition as the product style landing.
 */
export function CompatibilityView({
    model,
    breadcrumbTail,
    onQueryChange,
}: CompatibilityViewProps) {
    const tail =
        breadcrumbTail ??
        ([{label: 'Compatibility'}] as {label: string; href?: string}[]);

    const cardVariant = model.query.variant === 'b' ? 'b' : 'a';
    const cardMetaByProductId: Record<
        string,
        {badge?: string | null; note?: string | null}
    > = {};
    for (const [id, meta] of model.partialMeta) {
        if (cardVariant === 'b') {
            cardMetaByProductId[id] = {badge: meta.note, note: null};
        } else {
            cardMetaByProductId[id] = {badge: meta.badge, note: meta.note};
        }
    }

    const emptyMessage =
        model.selectedCount === 0
            ? 'Choose customizations to see compatible packaging products.'
            : model.selectedCount === 1
              ? 'No product supports this customization.'
              : `No product supports all ${model.selectedCount} customizations.`;

    return (
        <>
            <PageBreadcrumbSection
                items={[
                    {label: 'Home', href: WWW_ROUTES.home},
                    {
                        label: 'Customizations',
                        href: WWW_ROUTES.customizations,
                    },
                    ...tail,
                ]}
            />
            <PageHeadingWithMedia
                title={
                    model.selectedCount === 0 ? (
                        'Compatible products'
                    ) : (
                        <span className="flex flex-col gap-4">
                            <span>Products compatible with</span>
                            <span className="flex flex-wrap items-center gap-2 text-base font-medium tracking-normal">
                                {model.query.selections.map((sel, index) => (
                                    <span
                                        key={`${sel.category}/${sel.optionSlug}`}
                                        className="inline-flex max-w-full items-center rounded-full border border-border bg-background px-3 py-1 text-sm font-medium text-foreground"
                                    >
                                        <span className="truncate">
                                            {model.selectedTitles[index] ??
                                                sel.optionSlug}
                                        </span>
                                    </span>
                                ))}
                            </span>
                        </span>
                    )
                }
                description={model.subline ?? undefined}
                settle
                mediaContent={
                    <CompatibilityHeroMedia items={model.heroMedia} />
                }
            />
            {model.notices.length > 0 ? (
                <div className="mx-auto w-full max-w-7xl px-4 pb-4 sm:px-6 lg:px-8">
                    <ul className="flex flex-col gap-2" role="status">
                        {model.notices.map((notice) => (
                            <li
                                key={notice}
                                className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground"
                            >
                                {notice}
                            </li>
                        ))}
                    </ul>
                </div>
            ) : null}
            <ProductCatalogView
                library={model.library}
                urlSync
                showPageChrome={false}
                hideCatalogBorderTop
                emptyMessage={emptyMessage}
                productHrefQuery={model.queryString || undefined}
                cardMetaByProductId={
                    Object.keys(cardMetaByProductId).length > 0
                        ? cardMetaByProductId
                        : undefined
                }
                toolbarStart={
                    <CompatibilitySelectionBar
                        query={model.query}
                        pickerItems={model.pickerItems}
                        onQueryChange={onQueryChange}
                    />
                }
                toolbarEnd={
                    <CompatibilityCopyLinkButton
                        engineQueryString={model.engineQueryString}
                    />
                }
            />
        </>
    );
}
