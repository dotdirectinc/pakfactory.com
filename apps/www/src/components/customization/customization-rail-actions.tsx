'use client';

import type {MouseEvent} from 'react';
import {Bookmark, Download} from 'lucide-react';
import {Button} from '@pakfactory/ui/components/button';
import {InPageAnchorLink} from '@/components/common/in-page-anchor-link';
import {CUSTOMIZATION_REFERENCE_WORKS_WITH_ID} from '@/components/customization/customization-reference-works-with';
import {Icon} from '@/components/ui/icon';
import {StatusNotice} from '@/components/ui/status-badge';
import {stubBookmarkAction} from '@/lib/catalog-card-actions';
import type {CatalogLifecycle} from '@/lib/catalog/types';
import {WWW_ROUTES} from '@/lib/www-routes';

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

    const onBookmark = (event: MouseEvent<HTMLButtonElement>) => {
        stubBookmarkAction(event);
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
            {showBookmark ? (
                <Button
                    type="button"
                    variant="outline"
                    className="h-auto w-full px-6 py-3 text-base shadow-none"
                    onClick={onBookmark}
                >
                    <Icon icon={Bookmark} size="sm" />
                    Bookmark
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
