'use client';

import type {MouseEvent} from 'react';
import {usePathname} from 'next/navigation';
import {Bookmark, Columns2, Download} from 'lucide-react';
import {Button} from '@pakfactory/ui/components/button';
import {InPageAnchorLink} from '@/components/common/in-page-anchor-link';
import {CUSTOMIZATION_REFERENCE_WORKS_WITH_ID} from '@/components/customization/customization-reference-works-with';
import {useOptionalCustomizationDetailHost} from '@/components/customization/customization-detail-host';
import {useQuickConfigure} from '@/components/quick-configure/quick-configure';
import {resolveWorksWithApplyOption} from '@/lib/catalog/works-with-apply-option';
import {Icon} from '@/components/ui/icon';
import {StatusNotice} from '@/components/ui/status-badge';
import {runBookmarkToggle} from '@/lib/bookmarks/bookmark-actions';
import {CompareToggleLabel} from '@/components/compare/compare-toggle-label';
import {labelFromSlug} from '@/lib/compare/compare-set';
import {useCompareToggle} from '@/lib/compare/use-compare-toggle';
import {customizationBookmarkId, useBookmarks} from '@/lib/bookmarks/bookmarks';
import {useBookmarkAuth} from '@/lib/bookmarks/use-bookmark-auth';
import type {CatalogLifecycle} from '@/lib/catalog/types';
import {customizationCategoryHref, WWW_ROUTES} from '@/lib/www-routes';

export type CustomizationRailActionsProps = {
    showCta: boolean;
    showBookmark: boolean;
    /** CTA visible but not yet usable (Achieves with no selection). */
    applyDisabled?: boolean;
    specSheetUrl: string | null;
    lifecycle?: CatalogLifecycle;
};

/**
 * Apply / Bookmark / spec sheet stack shared by standard and learn-first
 * overview rails (PROD-3127).
 */
export function CustomizationRailActions({
    showCta,
    showBookmark,
    applyDisabled = false,
    specSheetUrl,
    lifecycle,
}: CustomizationRailActionsProps) {
    const showOrderCtas = !lifecycle || lifecycle === 'active';
    const showSpecSheet = Boolean(specSheetUrl);
    const pathname = usePathname() || '/';
    // F25: Apply opens the Apply popup (the buyer's items first) instead of scrolling.
    const quick = useQuickConfigure();
    const host = useOptionalCustomizationDetailHost();
    const applyInPopup = quick.enabled && Boolean(host);
    const openApplyPopup = () => {
        if (!host) return;
        const pageOption = {category: host.worksWith.option.category, slug: host.worksWith.option.slug};
        const option =
            resolveWorksWithApplyOption({
                showCta: host.showCta,
                configurationSource: host.configurationSource,
                pageOption,
                achieves: host.detail.achieves,
                selectedAchievesId: host.selectedAchievesId,
            }) ?? pageOption;
        quick.openApply({
            option: {...option, title: host.detail.shortName?.trim() || host.detail.title},
            suggestions: host.worksWith.products.map((p) => ({
                slug: p.slug,
                title: p.title,
                imageUrl: p.imageUrl,
                lineTitle: p.productLineTitle,
            })),
        });
    };

    // Bookmarks: the customization on this page (signed-in buyers; guests go to login).
    const {canBookmark, loginHref} = useBookmarkAuth();
    const {isBookmarked} = useBookmarks();
    const detail = host?.detail;
    const bookmarkId = detail ? customizationBookmarkId(detail.categoryValue, detail.slug) : '';
    const bookmarked = Boolean(bookmarkId) && isBookmarked('customization', bookmarkId);
    // R43 (PRD v4.6): Add to compare on the Customization DP; groups by library category (R44).
    const compareToggle = useCompareToggle(
        detail
            ? {
                  kind: 'customization',
                  id: bookmarkId,
                  title: detail.title,
                  href: customizationCategoryHref(detail.categoryValue, detail.slug),
                  imageUrl: detail.media[0]?.src ?? null,
                  groupKey: detail.categoryValue,
                  groupLabel: detail.categoryLabel?.trim() || labelFromSlug(detail.categoryValue),
                  categoryValue: detail.categoryValue,
                  ...(detail.typeTitle ? {typeTitle: detail.typeTitle} : {}),
              }
            : null,
    );
    const onBookmark = (event: MouseEvent<HTMLButtonElement>) => {
        if (!detail) return;
        runBookmarkToggle(
            event,
            {
                type: 'customization',
                id: bookmarkId,
                snapshot: {
                    title: detail.title,
                    href: customizationCategoryHref(detail.categoryValue, detail.slug),
                    imageUrl: detail.media[0]?.src ?? null,
                    categoryValue: detail.categoryValue,
                    ...(detail.typeSlug ? {typeSlug: detail.typeSlug} : {}),
                    ...(detail.typeTitle ? {typeTitle: detail.typeTitle} : {}),
                },
            },
            {allowed: canBookmark, loginHref: loginHref(pathname)},
        );
    };

    if (!showOrderCtas) {
        return (
            <StatusNotice
                status={lifecycle}
                contactHref={WWW_ROUTES.contact}
                className="mt-0"
            />
        );
    }

    if (!showCta && !showBookmark && !showSpecSheet) {
        return null;
    }

    return (
        <div className="flex flex-col gap-2">
            {showCta ? (
                applyDisabled ? (
                    <Button
                        type="button"
                        disabled
                        className="h-auto w-full px-6 py-3 text-base"
                    >
                        Apply to a product
                    </Button>
                ) : applyInPopup ? (
                    <Button
                        type="button"
                        className="h-auto w-full px-6 py-3 text-base"
                        onClick={openApplyPopup}
                    >
                        Apply to a product
                    </Button>
                ) : (
                    <Button asChild className="h-auto w-full px-6 py-3 text-base">
                        <InPageAnchorLink
                            href={`#${CUSTOMIZATION_REFERENCE_WORKS_WITH_ID}`}
                        >
                            Apply to a product
                        </InPageAnchorLink>
                    </Button>
                )
            ) : null}
            {showBookmark && detail ? (
                <Button
                    type="button"
                    variant="outline"
                    className="h-auto w-full px-6 py-3 text-base shadow-none"
                    onClick={onBookmark}
                    aria-pressed={bookmarked}
                >
                    <Icon icon={Bookmark} size="sm" />
                    {bookmarked ? 'Bookmarked' : 'Bookmark'}
                </Button>
            ) : null}
            {detail ? (
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
            ) : null}
            {showSpecSheet ? (
                <div className="flex justify-end">
                    <Button
                        asChild
                        variant="link"
                        size="sm"
                        className="h-auto gap-1 px-0 text-muted-foreground"
                    >
                        <a
                            href={specSheetUrl!}
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            <Icon icon={Download} size="sm" />
                            Download spec sheet
                        </a>
                    </Button>
                </div>
            ) : null}
        </div>
    );
}
