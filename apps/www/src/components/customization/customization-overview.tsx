'use client';

import {useMemo, useState} from 'react';
import {Leaf} from 'lucide-react';
import {
    PageDielineSection,
    type PageDielinePaddingBlock,
} from '@pakfactory/ui/components/page-dieline-section';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@pakfactory/ui/components/tooltip';
import {InPageAnchorLink} from '@/components/common/in-page-anchor-link';
import {CUSTOMIZATION_REFERENCE_WORKS_WITH_ID} from '@/components/customization/customization-reference-works-with';
import {useCustomizationDetailHost} from '@/components/customization/customization-detail-host';
import {CustomizationOptionHeroCopy} from '@/components/customization/customization-option-hero-copy';
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
import {
    CUSTOMIZATION_GALLERY_WELL_PREFETCH_WIDTH,
    CUSTOMIZATION_GALLERY_WELL_SIZES,
    ProductGallery,
} from '@/components/product/product-gallery';
import {Icon} from '@/components/ui/icon';
import {OverviewSection} from '@/components/ui/overview-section';
import {formatSectionEyebrow} from '@/components/ui/section-heading';
import {StatusBadge} from '@/components/ui/status-badge';
import {mapAchievesToPropertyField} from '@/lib/catalog/map-achieves-to-property-field';
import {resolveConfigurationFields} from '@/lib/catalog/resolve-configuration-fields';
import {
    buildSustainabilitySpecRows,
    specRowValues,
} from '@/lib/catalog/compare-matrix';
import {
    mapDetailToPropertyFields,
    type PropertyFieldDescriptor,
} from '@/lib/catalog/map-detail-to-property-fields';
import {isCustomColorSlug} from '@/lib/catalog/swatch-colors';

export const CUSTOMIZATION_OVERVIEW_ID = 'customization-overview';

export type CustomizationOverviewChromeProps = {
    paddingBlock?: PageDielinePaddingBlock;
    borderTop?: boolean;
    borderBottom?: boolean;
};

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
 * CDP overview — gallery + Sustainability / Applicable on / facts-well rail
 * (PROD-3112 · PROD-3120). Configuration (properties | Achieves), Show CTA,
 * and Bookmark come from overview section chrome.
 */
export function CustomizationOverview({
    paddingBlock = 'md',
    borderTop = false,
    borderBottom = true,
}: CustomizationOverviewChromeProps = {}) {
    const {
        detail,
        worksWith,
        setWorksWithLine,
        showCta,
        showBookmark,
        configurationSource,
        selectedAchievesId,
        setSelectedAchievesId,
    } = useCustomizationDetailHost();
    const typeEyebrow =
        detail.typeTitle?.trim() ||
        detail.categoryLabel ||
        detail.categoryValue;
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
    const sustainabilityValues = useMemo(
        () =>
            buildSustainabilitySpecRows(detail).flatMap((row) =>
                specRowValues(row),
            ),
        [detail],
    );
    const productLines = (
        worksWith.lines.length > 0 ? worksWith.lines : detail.productLines
    ).filter((line) => line.title?.trim());
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

    const showSelectable = fields.length > 0;
    const showSustainability = sustainabilityValues.length > 0;
    const showApplicableOn = productLines.length > 0;
    const showFactsWell =
        showSustainability || showApplicableOn || showSelectable;
    const specSheetUrl = detail.specSheetUrl?.trim() || null;
    const specsLabel =
        configurationSource === 'achieves'
            ? (achievesField?.label ?? 'Achievable options')
            : 'Choose your specs';
    const applyDisabled =
        showCta &&
        configurationSource === 'achieves' &&
        !selectedAchievesId;

    return (
            <PageDielineSection
                borderTop={borderTop}
                borderBottom={borderBottom}
                paddingBlock={paddingBlock}
            >
                <article
                    id={CUSTOMIZATION_OVERVIEW_ID}
                    className="scroll-mt-32 grid gap-10 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:items-start"
                >
                    <ProductGallery
                        media={detail.media}
                        productTitle={detail.title}
                        featuredVideoUrl={detail.featuredVideoUrl}
                        wellSizes={CUSTOMIZATION_GALLERY_WELL_SIZES}
                        wellPrefetchWidth={
                            CUSTOMIZATION_GALLERY_WELL_PREFETCH_WIDTH
                        }
                        wellMaxLoaderWidth={
                            CUSTOMIZATION_GALLERY_WELL_PREFETCH_WIDTH
                        }
                    />

                    <div className="flex min-w-0 flex-col gap-8">
                        <div>
                            <div className="flex items-center justify-between gap-4">
                                <p className="min-w-0 flex-1 truncate text-[11px] font-semibold tracking-[0.08em] text-primary uppercase">
                                    {formatSectionEyebrow(typeEyebrow)}
                                </p>
                                <StatusBadge
                                    status={detail.status}
                                    className="shrink-0"
                                />
                            </div>
                            <h1 className="mt-1 text-4xl font-semibold text-foreground">
                                {detail.title}
                            </h1>
                            <CustomizationOptionHeroCopy detail={detail} />
                        </div>

                        {showFactsWell ? (
                            <OverviewSection>
                                <div className="flex flex-col gap-6">
                                    {showSustainability ? (
                                        <div>
                                            <p className="mb-2 px-1 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                                                Sustainability
                                            </p>
                                            <ul className="flex flex-wrap gap-2">
                                                {sustainabilityValues.map(
                                                    (value) => (
                                                        <li key={value}>
                                                            <Tooltip>
                                                                <TooltipTrigger
                                                                    asChild
                                                                >
                                                                    <button
                                                                        type="button"
                                                                        className="inline-flex size-8 cursor-pointer items-center justify-center rounded-full border border-border bg-background text-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                                                                    >
                                                                        <Icon
                                                                            icon={
                                                                                Leaf
                                                                            }
                                                                            size="sm"
                                                                        />
                                                                        <span className="sr-only">
                                                                            {
                                                                                value
                                                                            }
                                                                        </span>
                                                                    </button>
                                                                </TooltipTrigger>
                                                                <TooltipContent
                                                                    side="bottom"
                                                                    sideOffset={
                                                                        8
                                                                    }
                                                                    variant="pill"
                                                                >
                                                                    {value}
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        </li>
                                                    ),
                                                )}
                                            </ul>
                                        </div>
                                    ) : null}

                                    {showApplicableOn ? (
                                        <div>
                                            <p className="mb-2 px-1 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                                                Applicable on
                                            </p>
                                            <ul className="flex flex-wrap gap-2">
                                                {productLines.map((line) => (
                                                    <li key={line.slug}>
                                                        <InPageAnchorLink
                                                            href={`#${CUSTOMIZATION_REFERENCE_WORKS_WITH_ID}`}
                                                            onClick={() =>
                                                                setWorksWithLine(
                                                                    line.slug,
                                                                )
                                                            }
                                                            className="inline-block rounded-full border border-border bg-background px-3 py-1 text-sm text-foreground hover:bg-background/80 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                                                        >
                                                            {line.title}
                                                        </InPageAnchorLink>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    ) : null}

                                    {showSelectable ? (
                                        <div>
                                            <p className="mb-2 px-1 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                                                {specsLabel}
                                            </p>
                                            <div className="rounded-xl border border-border bg-background p-4">
                                                <OptionPropertyControllers
                                                    fields={fields}
                                                    value={selection}
                                                    onChange={setPropertyValue}
                                                    onMapChange={
                                                        configurationSource ===
                                                        'achieves'
                                                            ? (next) =>
                                                                  setSelectedAchievesId(
                                                                      next
                                                                          .achieves?.[0] ??
                                                                          null,
                                                                  )
                                                            : setPropertySelection
                                                    }
                                                    variant="ghost"
                                                />
                                            </div>
                                        </div>
                                    ) : null}
                                </div>
                            </OverviewSection>
                        ) : null}

                        <div className="flex flex-col gap-6">
                            {showSelectable ? (
                                <div className="flex flex-col gap-2">
                                    <p className="text-base font-semibold text-foreground">
                                        Your selection
                                    </p>
                                    <dl className="flex flex-col divide-y divide-dashed divide-border">
                                        <div className="flex items-baseline justify-between gap-4 py-3 text-sm first:pt-0 last:pb-0">
                                            <dt className="shrink-0 text-muted-foreground">
                                                Material
                                            </dt>
                                            <dd className="min-w-0 text-right font-semibold text-foreground">
                                                {detail.title}
                                            </dd>
                                        </div>
                                        {fields.map((field) => {
                                            const value =
                                                titlesForIds(
                                                    field,
                                                    selection[field.propertyKey] ??
                                                        [],
                                                    selection,
                                                ).join(' · ') || '—';
                                            return (
                                                <div
                                                    key={field.propertyKey}
                                                    className="flex items-baseline justify-between gap-4 py-3 text-sm first:pt-0 last:pb-0"
                                                >
                                                    <dt className="shrink-0 text-muted-foreground">
                                                        {field.label}
                                                    </dt>
                                                    <dd className="min-w-0 text-right font-semibold text-foreground">
                                                        {value}
                                                    </dd>
                                                </div>
                                            );
                                        })}
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
                    </div>
                </article>
            </PageDielineSection>
    );
}
