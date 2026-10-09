'use client';

import {useMemo, useState, type MouseEvent} from 'react';
import {Bookmark, Download} from 'lucide-react';
import {Button} from '@pakfactory/ui/components/button';
import {Skeleton} from '@pakfactory/ui/components/skeleton';
import {InPageAnchorLink} from '@/components/common/in-page-anchor-link';
import {
    initialPropertySelection,
    OptionPropertyControllers,
    type PropertySelectionMap,
} from '@/components/customization/option-property-controllers';
import {CUSTOMIZATION_REFERENCE_WORKS_WITH_ID} from '@/components/customization/customization-reference-works-with';
import {Icon} from '@/components/ui/icon';
import {StatusNotice} from '@/components/ui/status-badge';
import {stubBookmarkAction} from '@/lib/catalog-card-actions';
import {
    mapDetailToPropertyFields,
    type PropertyFieldDescriptor,
} from '@/lib/catalog/map-detail-to-property-fields';
import type {CustomizationDetail} from '@/lib/catalog/types';
import {WWW_ROUTES} from '@/lib/www-routes';

type CustomizationConfigPanelProps = {
    detail: CustomizationDetail;
};

function titlesForIds(field: PropertyFieldDescriptor, ids: string[]): string[] {
    const byId = new Map(field.options.map((o) => [o.id, o.title]));
    return ids
        .map((id) => byId.get(id))
        .filter((t): t is string => Boolean(t));
}

/**
 * Right-rail Property controllers for customization Option detail (PROD-1299).
 * Configuration band is omitted when there are no selectable properties
 * (including after echo-title filtering).
 */
export function CustomizationConfigPanel({
    detail,
}: CustomizationConfigPanelProps) {
    const fields = useMemo(() => mapDetailToPropertyFields(detail), [detail]);
    const [selection, setSelection] = useState<PropertySelectionMap>(() =>
        initialPropertySelection(fields),
    );

    const selectionSummary = useMemo(() => {
        const parts: string[] = [];
        for (const field of fields) {
            const ids = selection[field.propertyKey] ?? [];
            parts.push(...titlesForIds(field, ids));
        }
        return parts.join(' · ');
    }, [fields, selection]);

    const specSheetUrl = detail.specSheetUrl?.trim() || null;

    const setPropertyValue = (propertyKey: string, ids: string[]) => {
        setSelection((prev) => ({...prev, [propertyKey]: ids}));
    };

    const onBookmark = (event: MouseEvent<HTMLButtonElement>) => {
        stubBookmarkAction(event);
    };

    const lifecycle = detail.status;
    const showOrderCtas = !lifecycle || lifecycle === 'active';
    const hasConfig = fields.length > 0;

    return (
        <div className="mt-8 flex flex-col gap-6">
            {hasConfig ? (
                <div className="flex flex-col gap-4 border-t border-dashed border-border pt-4">
                    <h2 className="text-base font-semibold text-foreground">
                        Configuration
                    </h2>
                    <div className="flex flex-col gap-6">
                        <OptionPropertyControllers
                            fields={fields}
                            value={selection}
                            onChange={setPropertyValue}
                        />
                    </div>
                </div>
            ) : null}

            {hasConfig ? (
                <div className="flex flex-col gap-2 border-t border-dashed border-border pt-4">
                    <p className="text-base font-semibold text-foreground">
                        Your selection
                    </p>
                    <dl className="flex flex-col gap-1">
                        <div className="flex items-baseline justify-between gap-4 text-sm">
                            <dt className="shrink-0 text-muted-foreground">
                                Material
                            </dt>
                            <dd className="min-w-0 text-right font-semibold text-foreground">
                                {detail.title}
                            </dd>
                        </div>
                        <div className="flex items-baseline justify-between gap-4 text-sm">
                            <dt className="shrink-0 text-muted-foreground">
                                Selection
                            </dt>
                            <dd className="min-w-0 text-right font-semibold text-foreground">
                                {selectionSummary || '—'}
                            </dd>
                        </div>
                    </dl>
                </div>
            ) : null}

            {showOrderCtas ? (
                <div className="flex flex-col gap-2">
                    <Button asChild className="h-auto w-full px-6 py-3 text-base">
                        <InPageAnchorLink
                            href={`#${CUSTOMIZATION_REFERENCE_WORKS_WITH_ID}`}
                        >
                            Apply to a product
                        </InPageAnchorLink>
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        className="h-auto w-full px-6 py-3 text-base shadow-none"
                        onClick={onBookmark}
                    >
                        <Icon icon={Bookmark} size="sm" />
                        Bookmark
                    </Button>
                    {specSheetUrl ? (
                        <div className="flex justify-end">
                            <Button
                                asChild
                                variant="link"
                                size="sm"
                                className="h-auto gap-1 px-0 text-muted-foreground"
                            >
                                <a
                                    href={specSheetUrl}
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
            ) : (
                <StatusNotice
                    status={lifecycle}
                    contactHref={WWW_ROUTES.contact}
                    className="mt-0"
                />
            )}
        </div>
    );
}

/**
 * Loading chrome for {@link CustomizationConfigPanel} — same dashed config
 * band and CTA stack spacing as the live panel.
 */
export function CustomizationConfigPanelSkeleton() {
    return (
        <div
            className="mt-8 flex flex-col gap-6"
            aria-busy="true"
            aria-live="polite"
        >
            <span className="sr-only">Loading configuration</span>
            <div
                className="flex flex-col gap-4 border-t border-dashed border-border pt-4"
                aria-hidden
            >
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-24 w-full rounded-md" />
                <Skeleton className="h-24 w-full rounded-md" />
            </div>
            <div className="flex flex-col gap-2" aria-hidden>
                <Skeleton className="h-12 w-full rounded-md" />
                <Skeleton className="h-12 w-full rounded-md" />
            </div>
        </div>
    );
}
