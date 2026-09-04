'use client';

import {Button} from '@pakfactory/ui/components/button';
import {BuilderThreeColumn} from '@/components/customization-builder/builder-three-column';
import {CUSTOMIZATION_BUILDER_COPY} from '@/components/customization-builder/copy';
import {
    firstUnresolvedStepIndex,
    getAnswer,
    isAnswerReady,
    type BuilderOption,
    type BuilderStep,
    type BuilderStepKey,
    type CustomizationBuilderState,
    type StepAnswer,
} from '@/lib/customization-builder';

type CustomizationGuidedViewProps = {
    steps: BuilderStep[];
    activeKey: BuilderStepKey;
    activeTypeId: string | null;
    activeOptionId: string | null;
    state: CustomizationBuilderState;
    onSelectStep: (key: BuilderStepKey) => void;
    onSelectConsultation: () => void;
    onSelectType: (typeId: string) => void;
    onSelectOption: (option: BuilderOption) => void;
    onAnswerChange: (key: BuilderStepKey, answer: StepAnswer) => void;
    onClearCategory: (key: BuilderStepKey) => void;
    onEntryNoteChange: (entryKey: string, note: string) => void;
    onBack: () => void;
    onNext: () => void;
    onSkip: () => void;
    onDone: () => void;
};

export function CustomizationGuidedView({
    steps,
    activeKey,
    activeTypeId,
    activeOptionId,
    state,
    onSelectStep,
    onSelectConsultation,
    onSelectType,
    onSelectOption,
    onAnswerChange,
    onClearCategory,
    onEntryNoteChange,
    onBack,
    onNext,
    onSkip,
    onDone,
}: CustomizationGuidedViewProps) {
    const stepIndex = Math.max(
        0,
        steps.findIndex((step) => step.key === activeKey),
    );
    const isFirst = stepIndex <= 0;
    const isLast = stepIndex >= steps.length - 1;
    const canAdvance = isAnswerReady(getAnswer(state, activeKey));
    const maxReachableIndex = firstUnresolvedStepIndex(state, steps);

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
            state={state}
            numberedRail
            maxReachableIndex={maxReachableIndex}
            onSelectCategory={handleSelectStep}
            onSelectConsultation={onSelectConsultation}
            onSelectType={onSelectType}
            onSelectOption={onSelectOption}
            onAnswerChange={onAnswerChange}
            onClearCategory={onClearCategory}
            onEntryNoteChange={onEntryNoteChange}
            footer={
                <div className="flex shrink-0 items-center justify-between gap-3 border-t border-border px-4 py-3">
                    <Button
                        type="button"
                        variant="outline"
                        size="lg"
                        disabled={isFirst}
                        onClick={onBack}
                    >
                        {CUSTOMIZATION_BUILDER_COPY.back}
                    </Button>
                    <div className="flex items-center gap-3">
                        <Button
                            type="button"
                            variant="link"
                            className="px-0"
                            onClick={onSkip}
                        >
                            {CUSTOMIZATION_BUILDER_COPY.skip}
                        </Button>
                        {isLast ? (
                            <Button
                                type="button"
                                size="lg"
                                disabled={!canAdvance}
                                onClick={onDone}
                            >
                                {CUSTOMIZATION_BUILDER_COPY.done}
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
            }
        />
    );
}
