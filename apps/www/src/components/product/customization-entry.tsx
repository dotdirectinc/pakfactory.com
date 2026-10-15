'use client';

import {useMemo, useState} from 'react';
import dynamic from 'next/dynamic';
import {Check, ChevronRight} from 'lucide-react';
import {Button} from '@pakfactory/ui/components/button';
import {cn} from '@pakfactory/ui/lib/utils';
import {CUSTOMIZATION_BUILDER_COPY} from '@/components/customization-builder/copy';
import {SelectionSummaryDisplay} from '@/components/customization-builder/ui/selection-summary-display';
import {
    CompatibilityPreselectDroppedNote,
    type CompatibilityPreselectNotice,
} from '@/components/product/compatibility-preselect';
import {REQUEST_COPY} from '@/lib/copy/request';
import type {
    CustomizationOption,
    ProductDimensionRange,
} from '@/lib/catalog/types';
import type {CustomizationRulesSnapshot} from '@/lib/catalog/customization-rules';
import {
    buildStepsFromCatalog,
    createEmptyBuilderState,
    DIMENSIONS_STEP_KEY,
    getAnswer,
    isBuilderConfigured,
    summarizeAnswer,
    type BuilderStepKey,
    type CustomizationBuilderState,
    type PrintableSide,
    type PropertySummariesByOption,
    type StepAnswer,
} from '@/lib/customization-builder';

/** Step keys for options listed in the compatibility preselect notice. */
function preselectedStepKeys(
    availableCustomizations: CustomizationOption[],
    appliedLabels: string[] | undefined,
): Set<BuilderStepKey> {
    const keys = new Set<BuilderStepKey>();
    if (!appliedLabels?.length) return keys;
    const byLabel = new Map(
        availableCustomizations.map((opt) => [opt.label.trim().toLowerCase(), opt]),
    );
    for (const label of appliedLabels) {
        const opt = byLabel.get(label.trim().toLowerCase());
        const category = opt?.category?.trim();
        if (category) keys.add(category);
    }
    return keys;
}

const CustomizationBuilder = dynamic(
    () =>
        import('@/components/customization-builder/customization-builder').then(
            (mod) => mod.CustomizationBuilder,
        ),
    {ssr: false},
);

type CustomizationEntryProps = {
    availableCustomizations: CustomizationOption[];
    /** The product's customization rules (PROD-2556); the builder narrows on them. */
    customizationRules?: CustomizationRulesSnapshot;
    builderState: CustomizationBuilderState;
    onBuilderStateChange: (next: CustomizationBuilderState) => void;
    productTitle?: string;
    dimensionInput?: string;
    dimensionRange?: ProductDimensionRange;
    /** Product Printable Sides — drives Printing gate rows. */
    printableSides?: PrintableSide[];
    /**
     * Inspiration products: options are pre-selected. Shows preset copy,
     * "Change" row actions, and hides the specialist revert link.
     */
    preset?: boolean;
    /** Compatibility engine → PDP preselect notice under the heading. */
    compatibilityPreselect?: CompatibilityPreselectNotice | null;
    onClearCompatibilityPreselect?: () => void;
};

type SummaryRowProps = {
    label: string;
    answer: StepAnswer;
    propertySummaries?: PropertySummariesByOption;
    onCustomize: () => void;
    rowActionLabel: string;
    preselected?: boolean;
};

function SummaryRow({
    label,
    answer,
    propertySummaries,
    onCustomize,
    rowActionLabel,
    preselected = false,
}: SummaryRowProps) {
    const summaryText = summarizeAnswer(
        answer,
        CUSTOMIZATION_BUILDER_COPY.specialistToAdvise,
        {propertySummaries},
    );
    const isUnset = summaryText === 'Not set';

    return (
        <button
            type="button"
            onClick={onCustomize}
            className="flex w-full cursor-pointer items-center gap-4 px-4 py-4 text-left transition-colors hover:bg-muted/50"
        >
            <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-sm font-semibold text-foreground">
                    <span>{label}</span>
                    {preselected ? (
                        <span className="text-xs font-medium text-muted-foreground">
                            {REQUEST_COPY.preselectedLabel}
                        </span>
                    ) : null}
                </p>
                <div className="mt-0.5 text-xs text-muted-foreground">
                    {isUnset ? (
                        REQUEST_COPY.notSet
                    ) : (
                        <SelectionSummaryDisplay
                            answer={answer}
                            specialistLabel={
                                CUSTOMIZATION_BUILDER_COPY.specialistToAdvise
                            }
                            propertySummaries={propertySummaries}
                        />
                    )}
                </div>
            </div>
            <span className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-muted-foreground">
                {rowActionLabel}
                <ChevronRight className="size-4" aria-hidden />
            </span>
        </button>
    );
}

type SummaryGroupProps = {
    title: string;
    rows: {key: BuilderStepKey; label: string}[];
    builderState: CustomizationBuilderState;
    onCustomize: (key: BuilderStepKey) => void;
    rowActionLabel: string;
    preselectedKeys?: Set<BuilderStepKey>;
};

function SummaryGroup({
    title,
    rows,
    builderState,
    onCustomize,
    rowActionLabel,
    preselectedKeys,
}: SummaryGroupProps) {
    if (rows.length === 0) return null;
    return (
        <div>
            <p className="mb-1.5 px-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {title}
            </p>
            <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-background">
                {rows.map((row) => {
                    const answer = getAnswer(builderState, row.key);
                    return (
                        <SummaryRow
                            key={row.key}
                            label={row.label}
                            answer={answer}
                            propertySummaries={
                                builderState.propertySelectionSummaries
                            }
                            onCustomize={() => onCustomize(row.key)}
                            rowActionLabel={rowActionLabel}
                            preselected={preselectedKeys?.has(row.key)}
                        />
                    );
                })}
            </div>
        </div>
    );
}

export function CustomizationEntry({
    availableCustomizations,
    customizationRules,
    builderState,
    onBuilderStateChange,
    productTitle,
    dimensionInput,
    dimensionRange,
    printableSides,
    preset = false,
    compatibilityPreselect = null,
    onClearCompatibilityPreselect,
}: CustomizationEntryProps) {
    const [open, setOpen] = useState(false);
    const [initialStepKey, setInitialStepKey] = useState<
        BuilderStepKey | undefined
    >(undefined);
    const configured = isBuilderConfigured(builderState);
    const rowActionLabel = preset
        ? REQUEST_COPY.changeRow
        : REQUEST_COPY.customizeRow;

    const steps = useMemo(
        () => buildStepsFromCatalog(availableCustomizations),
        [availableCustomizations],
    );
    const sizeRows = steps
        .filter((step) => step.key === DIMENSIONS_STEP_KEY)
        .map((step) => ({key: step.key, label: REQUEST_COPY.dimensionsRow}));
    const materialFinishRows = steps
        .filter((step) => step.kind === 'selection')
        .map((step) => ({key: step.key, label: step.label}));

    const preselectedKeys = useMemo(
        () =>
            preselectedStepKeys(
                availableCustomizations,
                compatibilityPreselect?.applied,
            ),
        [availableCustomizations, compatibilityPreselect?.applied],
    );
    const showClearSelection =
        Boolean(onClearCompatibilityPreselect) &&
        Boolean(
            compatibilityPreselect &&
                (compatibilityPreselect.applied.length > 0 ||
                    compatibilityPreselect.dropped.length > 0),
        );

    function openBuilder(stepKey?: BuilderStepKey) {
        setInitialStepKey(stepKey);
        setOpen(true);
    }

    function handleOpenChange(next: boolean) {
        setOpen(next);
        if (!next) setInitialStepKey(undefined);
    }

    return (
        <div>
            <div className="flex items-baseline justify-between gap-4">
                <h2 className="text-base font-semibold text-brand-blue">
                    {REQUEST_COPY.customizationHeading}
                </h2>
                {showClearSelection ? (
                    <Button
                        type="button"
                        variant="link"
                        className="h-auto shrink-0 px-0 text-sm"
                        onClick={onClearCompatibilityPreselect}
                    >
                        {REQUEST_COPY.clearSelection}
                    </Button>
                ) : null}
            </div>
            {preset ? (
                <p className="mt-1 text-sm text-muted-foreground">
                    {REQUEST_COPY.customizationPresetDescription}
                </p>
            ) : null}
            <CompatibilityPreselectDroppedNote
                notice={compatibilityPreselect}
            />

            {configured ? (
                <div className="mt-4 space-y-4">
                    <SummaryGroup
                        title={REQUEST_COPY.sizeGroup}
                        rows={sizeRows}
                        builderState={builderState}
                        onCustomize={openBuilder}
                        rowActionLabel={rowActionLabel}
                        preselectedKeys={preselectedKeys}
                    />
                    <SummaryGroup
                        title={REQUEST_COPY.materialFinishGroup}
                        rows={materialFinishRows}
                        builderState={builderState}
                        onCustomize={openBuilder}
                        rowActionLabel={rowActionLabel}
                        preselectedKeys={preselectedKeys}
                    />
                    {!preset ? (
                        <button
                            type="button"
                            className={cn(
                                'cursor-pointer text-xs font-medium text-muted-foreground underline decoration-muted-foreground/40 underline-offset-4 hover:text-foreground',
                            )}
                            onClick={() =>
                                onBuilderStateChange(createEmptyBuilderState())
                            }
                        >
                            {REQUEST_COPY.revertToSpecialist}
                        </button>
                    ) : null}
                </div>
            ) : (
                <div className="mt-4 flex flex-col gap-4 rounded-xl bg-background p-4">
                    <div className="flex items-start gap-2">
                        <Check
                            className="size-4 shrink-0 text-brand-forest"
                            aria-hidden
                        />
                        <p className="text-sm text-foreground">
                            {REQUEST_COPY.specialistCanPropose}
                        </p>
                    </div>
                    <Button
                        type="button"
                        variant="outline"
                        className="w-full"
                        onClick={() => openBuilder()}
                    >
                        {REQUEST_COPY.customizeItYourself}
                    </Button>
                </div>
            )}

            <CustomizationBuilder
                open={open}
                onOpenChange={handleOpenChange}
                availableCustomizations={availableCustomizations}
                value={builderState}
                onChange={onBuilderStateChange}
                productTitle={productTitle}
                initialStepKey={initialStepKey}
                dimensionInput={dimensionInput}
                dimensionRange={dimensionRange}
                printableSides={printableSides}
                customizationRules={customizationRules}
            />
        </div>
    );
}

export {createEmptyBuilderState};
