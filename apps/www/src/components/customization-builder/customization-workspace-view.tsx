'use client';

import {BuilderThreeColumn} from '@/components/customization-builder/builder-three-column';
import type {ProductDimensionRange} from '@/lib/catalog/types';
import type {
    BuilderOption,
    BuilderStep,
    BuilderStepKey,
    CustomizationBuilderState,
    StepAnswer,
} from '@/lib/customization-builder';

type CustomizationWorkspaceViewProps = {
    steps: BuilderStep[];
    activeKey: BuilderStepKey;
    activeTypeId: string | null;
    activeOptionId: string | null;
    state: CustomizationBuilderState;
    dimensionRange?: ProductDimensionRange;
    onSelectStep: (key: BuilderStepKey) => void;
    onSelectConsultation: () => void;
    onSelectType: (typeId: string) => void;
    onSelectOption: (option: BuilderOption) => void;
    onAnswerChange: (key: BuilderStepKey, answer: StepAnswer) => void;
    onClearCategory: (key: BuilderStepKey) => void;
    onEntryNoteChange: (entryKey: string, note: string) => void;
};

export function CustomizationWorkspaceView({
    steps,
    activeKey,
    activeTypeId,
    activeOptionId,
    state,
    dimensionRange,
    onSelectStep,
    onSelectConsultation,
    onSelectType,
    onSelectOption,
    onAnswerChange,
    onClearCategory,
    onEntryNoteChange,
}: CustomizationWorkspaceViewProps) {
    return (
        <BuilderThreeColumn
            steps={steps}
            activeKey={activeKey}
            activeTypeId={activeTypeId}
            activeOptionId={activeOptionId}
            state={state}
            dimensionRange={dimensionRange}
            onSelectCategory={onSelectStep}
            onSelectConsultation={onSelectConsultation}
            onSelectType={onSelectType}
            onSelectOption={onSelectOption}
            onAnswerChange={onAnswerChange}
            onClearCategory={onClearCategory}
            onEntryNoteChange={onEntryNoteChange}
        />
    );
}
