'use client';

import {BuilderThreeColumn} from '@/components/customization-builder/builder-three-column';
import type {PropertySelectionMap} from '@/components/customization/option-property-controllers';
import type {ProductDimensionRange} from '@/lib/catalog/types';
import type {
    BuilderOption,
    BuilderStep,
    BuilderStepKey,
    CustomizationBuilderState,
    PropertySelectionSummaryItem,
    StepAnswer,
} from '@/lib/customization-builder';

type CustomizationWorkspaceViewProps = {
    steps: BuilderStep[];
    activeKey: BuilderStepKey;
    activeTypeId: string | null;
    activeOptionId: string | null;
    state: CustomizationBuilderState;
    dimensionRange?: ProductDimensionRange;
    dimensionInput?: string;
    dimensionAxisIds?: readonly string[];
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
};

export function CustomizationWorkspaceView({
    steps,
    activeKey,
    activeTypeId,
    activeOptionId,
    state,
    dimensionRange,
    dimensionInput,
    dimensionAxisIds,
    onSelectStep,
    onSelectConsultation,
    onSelectType,
    onSelectOption,
    onAnswerChange,
    onClearCategory,
    onEntryNoteChange,
    onPropertySelectionsChange,
}: CustomizationWorkspaceViewProps) {
    return (
        <BuilderThreeColumn
            steps={steps}
            activeKey={activeKey}
            activeTypeId={activeTypeId}
            activeOptionId={activeOptionId}
            state={state}
            dimensionRange={dimensionRange}
            dimensionInput={dimensionInput}
            dimensionAxisIds={dimensionAxisIds}
            onSelectCategory={onSelectStep}
            onSelectConsultation={onSelectConsultation}
            onSelectType={onSelectType}
            onSelectOption={onSelectOption}
            onAnswerChange={onAnswerChange}
            onClearCategory={onClearCategory}
            onEntryNoteChange={onEntryNoteChange}
            onPropertySelectionsChange={onPropertySelectionsChange}
        />
    );
}
