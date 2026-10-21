'use client';

import {useMemo, useState} from 'react';
import {Skeleton} from '@pakfactory/ui/components/skeleton';
import {useCustomizationDetailHost} from '@/components/customization/customization-detail-host';
import {CustomizationRailActions} from '@/components/customization/customization-rail-actions';
import {
    initialPropertySelection,
    OptionPropertyControllers,
    type PropertySelectionMap,
} from '@/components/customization/option-property-controllers';
import {
    customColorSummaryLabel,
    readCustomColorHex,
} from '@/components/customization-builder/custom-color-property';
import {mapAchievesToPropertyField} from '@/lib/catalog/map-achieves-to-property-field';
import {
    mapDetailToPropertyFields,
    type PropertyFieldDescriptor,
} from '@/lib/catalog/map-detail-to-property-fields';
import {resolveConfigurationFields} from '@/lib/catalog/resolve-configuration-fields';
import {isCustomColorSlug} from '@/lib/catalog/swatch-colors';

function titlesForIds(
    field: PropertyFieldDescriptor,
    ids: string[],
    selection: PropertySelectionMap,
): string[] {
    const byId = new Map(field.options.map((o) => [o.id, o]));
    return ids
        .map((id) => {
            const option = byId.get(id);
            if (!option) return undefined;
            const isCustom =
                option.appearance === 'customColor' ||
                isCustomColorSlug(id);
            if (!isCustom) return option.title;
            return customColorSummaryLabel(
                option.title,
                readCustomColorHex(selection, field.propertyKey),
            );
        })
        .filter((t): t is string => Boolean(t));
}

/**
 * Right-rail Property / Achieves controllers for customization Option detail
 * (PROD-1299 / PROD-3128). Configuration band is omitted when the active
 * source has nothing to show.
 */
export function CustomizationConfigPanel() {
    const {
        detail,
        showCta,
        showBookmark,
        configurationSource,
        selectedAchievesId,
        setSelectedAchievesId,
    } = useCustomizationDetailHost();

    const propertyFields = useMemo(
        () => mapDetailToPropertyFields(detail),
        [detail],
    );
    const achievesField = useMemo(
        () => mapAchievesToPropertyField(detail.achieves),
        [detail.achieves],
    );
    const fields = useMemo(
        () =>
            resolveConfigurationFields(
                configurationSource,
                propertyFields,
                achievesField,
            ),
        [configurationSource, achievesField, propertyFields],
    );

    const [propertySelection, setPropertySelection] =
        useState<PropertySelectionMap>(() =>
            initialPropertySelection(propertyFields),
        );

    const selection = useMemo((): PropertySelectionMap => {
        if (configurationSource === 'achieves') {
            return selectedAchievesId
                ? {achieves: [selectedAchievesId]}
                : {};
        }
        return propertySelection;
    }, [configurationSource, selectedAchievesId, propertySelection]);

    const selectionSummary = useMemo(() => {
        const parts: string[] = [];
        for (const field of fields) {
            const ids = selection[field.propertyKey] ?? [];
            parts.push(...titlesForIds(field, ids, selection));
        }
        return parts.join(' · ');
    }, [fields, selection]);

    const specSheetUrl = detail.specSheetUrl?.trim() || null;

    const setPropertyValue = (propertyKey: string, ids: string[]) => {
        if (configurationSource === 'achieves') {
            setSelectedAchievesId(ids[0] ?? null);
            return;
        }
        setPropertySelection((prev) => {
            const next = {...prev};
            if (!ids.length) delete next[propertyKey];
            else next[propertyKey] = ids;
            return next;
        });
    };

    const hasConfig = fields.length > 0;
    const applyDisabled =
        showCta &&
        configurationSource === 'achieves' &&
        !selectedAchievesId;

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
                            onMapChange={
                                configurationSource === 'achieves'
                                    ? (next) =>
                                          setSelectedAchievesId(
                                              next.achieves?.[0] ?? null,
                                          )
                                    : setPropertySelection
                            }
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

            <CustomizationRailActions
                showCta={showCta}
                showBookmark={showBookmark}
                applyDisabled={applyDisabled}
                specSheetUrl={specSheetUrl}
                lifecycle={detail.status}
            />
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
