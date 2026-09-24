'use client';

import {useMemo, useState} from 'react';
import dynamic from 'next/dynamic';
import {Check, ChevronRight} from 'lucide-react';
import {Button} from '@pakfactory/ui/components/button';
import {cn} from '@pakfactory/ui/lib/utils';
import {CUSTOMIZATION_BUILDER_COPY} from '@/components/customization-builder/copy';
import {SelectionSummaryDisplay} from '@/components/customization-builder/ui/selection-summary-display';
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
    type PropertySelectionSummaryItem,
    type StepAnswer,
} from '@/lib/customization-builder';

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
};

type SummaryRowProps = {
    label: string;
    answer: StepAnswer;
    propertySummaries?: PropertySelectionSummaryItem[];
    onCustomize: () => void;
};

function SummaryRow({
    label,
    answer,
    propertySummaries,
    onCustomize,
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
                <p className="text-sm font-semibold text-foreground">{label}</p>
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
                {REQUEST_COPY.customizeRow}
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
};

function SummaryGroup({
    title,
    rows,
    builderState,
    onCustomize,
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
                    const optionId =
                        answer.status === 'set' && 'selection' in answer
                            ? answer.selection.optionId
                            : undefined;
                    return (
                        <SummaryRow
                            key={row.key}
                            label={row.label}
                            answer={answer}
                            propertySummaries={
                                optionId
                                    ? builderState.propertySelectionSummaries?.[
                                          optionId
                                      ]
                                    : undefined
                            }
                            onCustomize={() => onCustomize(row.key)}
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
}: CustomizationEntryProps) {
    const [open, setOpen] = useState(false);
    const [initialStepKey, setInitialStepKey] = useState<
        BuilderStepKey | undefined
    >(undefined);
    const configured = isBuilderConfigured(builderState);

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
            <h2 className="text-base font-semibold text-brand-blue">
                {REQUEST_COPY.customizationHeading}
            </h2>

            {configured ? (
                <div className="mt-4 space-y-4">
                    <SummaryGroup
                        title={REQUEST_COPY.sizeGroup}
                        rows={sizeRows}
                        builderState={builderState}
                        onCustomize={openBuilder}
                    />
                    <SummaryGroup
                        title={REQUEST_COPY.materialFinishGroup}
                        rows={materialFinishRows}
                        builderState={builderState}
                        onCustomize={openBuilder}
                    />
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
                customizationRules={customizationRules}
            />
        </div>
    );
}

export {createEmptyBuilderState};
