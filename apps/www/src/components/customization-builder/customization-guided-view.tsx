'use client';

import {Button} from '@pakfactory/ui/components/button';
import {BuilderThreeColumn} from '@/components/customization-builder/builder-three-column';
import {CUSTOMIZATION_BUILDER_COPY} from '@/components/customization-builder/copy';
import type {PropertySelectionMap} from '@/components/customization/option-property-controllers';
import type {ProductDimensionRange} from '@/lib/catalog/types';
import {
    isStepReady,
    type BuilderOption,
    type BuilderStep,
    type BuilderStepKey,
    type CustomColorReferenceImage,
    type CustomizationBuilderState,
    type PrintSideValue,
    type PropertySelectionSummaryItem,
    type StepAnswer,
} from '@/lib/customization-builder';
import type {PrintableSide} from '@/lib/customization-builder/printable-sides';

type CustomizationGuidedViewProps = {
    steps: BuilderStep[];
    activeKey: BuilderStepKey;
    activeTypeId: string | null;
    activeOptionId: string | null;
    /** Options the rules rule out given the other picks: listed, not selectable. */
    disabledOptionIds?: ReadonlySet<string>;
    state: CustomizationBuilderState;
    /** Highest rail index unlocked by Next/Skip commit. */
    maxReachableIndex: number;
    dimensionRange?: ProductDimensionRange;
    dimensionInput?: string;
    dimensionAxisIds?: readonly string[];
    printableSides?: PrintableSide[];
    onSelectStep: (key: BuilderStepKey) => void;
    onSelectConsultation: () => void;
    onSelectType: (typeId: string) => void;
    onSelectOption: (option: BuilderOption) => void;
    onAnswerChange: (key: BuilderStepKey, answer: StepAnswer) => void;
    onClearCategory: (key: BuilderStepKey) => void;
    onEntryNoteChange: (entryKey: string, note: string) => void;
    onPropertySelectionsChange: (
        optionId: string,
        selections: PropertySelectionMap,
        summaries: PropertySelectionSummaryItem[],
    ) => void;
    onPrintedSideChange: (slug: string, next: PrintSideValue) => void;
    onPrintingConsultation: () => void;
    draftId?: string;
    onCustomColorReferenceChange?: (
        optionId: string,
        propertyKey: string,
        image: CustomColorReferenceImage | null,
    ) => void;
    onBack: () => void;
    onNext: () => void;
    onSkip: () => void;
    onDone: () => void;
    layout?: 'columns' | 'stack';
    showRail?: boolean;
    onDetailOpenChange?: (open: boolean) => void;
};

export function CustomizationGuidedView({
    steps,
    activeKey,
    activeTypeId,
    activeOptionId,
    disabledOptionIds,
    state,
    maxReachableIndex,
    dimensionRange,
    dimensionInput,
    dimensionAxisIds,
    printableSides = [],
    onSelectStep,
    onSelectConsultation,
    onSelectType,
    onSelectOption,
    onAnswerChange,
    onClearCategory,
    onEntryNoteChange,
    onPropertySelectionsChange,
    onPrintedSideChange,
    onPrintingConsultation,
    draftId,
    onCustomColorReferenceChange,
    onBack,
    onNext,
    onSkip,
    onDone,
    layout = 'columns',
    showRail = true,
    onDetailOpenChange,
}: CustomizationGuidedViewProps) {
    const stepIndex = Math.max(
        0,
        steps.findIndex((step) => step.key === activeKey),
    );
    const isFirst = stepIndex <= 0;
    const isLast = stepIndex >= steps.length - 1;
    const step = steps[stepIndex];
    const canAdvance = step
        ? isStepReady(state, step, dimensionAxisIds, printableSides)
        : false;

    function handleSelectStep(key: BuilderStepKey) {
        const index = steps.findIndex((step) => step.key === key);
        if (index > maxReachableIndex) return;
        onSelectStep(key);
    }

    return (
        <BuilderThreeColumn
            steps={steps}
            activeKey={activeKey}
            activeTypeId={activeTypeId}
            activeOptionId={activeOptionId}
            disabledOptionIds={disabledOptionIds}
            state={state}
            numberedRail
            maxReachableIndex={maxReachableIndex}
            dimensionRange={dimensionRange}
            dimensionInput={dimensionInput}
            dimensionAxisIds={dimensionAxisIds}
            printableSides={printableSides}
            onSelectCategory={handleSelectStep}
            onSelectConsultation={onSelectConsultation}
            onSelectType={onSelectType}
            onSelectOption={onSelectOption}
            onAnswerChange={onAnswerChange}
            onClearCategory={onClearCategory}
            onEntryNoteChange={onEntryNoteChange}
            onPropertySelectionsChange={onPropertySelectionsChange}
            onPrintedSideChange={onPrintedSideChange}
            onPrintingConsultation={onPrintingConsultation}
            draftId={draftId}
            onCustomColorReferenceChange={onCustomColorReferenceChange}
            layout={layout}
            showRail={showRail}
            onDetailOpenChange={onDetailOpenChange}
            footer={({detailOpen}) => (
                <div
                    className={
                        layout === 'stack' && detailOpen
                            ? 'flex shrink-0 items-center justify-end gap-3 border-t border-border px-4 py-3'
                            : 'flex shrink-0 items-center justify-between gap-3 border-t border-border px-4 py-3'
                    }
                >
                    {layout === 'stack' && detailOpen ? null : (
                        <Button
                            type="button"
                            variant="outline"
                            size="lg"
                            disabled={isFirst}
                            onClick={onBack}
                        >
                            {CUSTOMIZATION_BUILDER_COPY.back}
                        </Button>
                    )}
                    <div className="flex items-center gap-3">
                        <Button
                            type="button"
                            variant="link"
                            className="px-0"
                            onClick={onSkip}
                        >
                            {layout === 'stack'
                                ? CUSTOMIZATION_BUILDER_COPY.skipStep
                                : CUSTOMIZATION_BUILDER_COPY.skip}
                        </Button>
                        {isLast ? (
                            <Button
                                type="button"
                                size="lg"
                                disabled={!canAdvance}
                                onClick={onDone}
                            >
                                {CUSTOMIZATION_BUILDER_COPY.save}
                            </Button>
                        ) : (
                            <Button
                                type="button"
                                size="lg"
                                disabled={!canAdvance}
                                onClick={onNext}
                            >
                                {CUSTOMIZATION_BUILDER_COPY.next}
                            </Button>
                        )}
                    </div>
                </div>
            )}
        />
    );
}
