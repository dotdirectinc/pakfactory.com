'use client';

import type {ReactNode} from 'react';
import {CategoryTypeList} from '@/components/customization-builder/category-type-list';
import {CustomizationCategoryRail} from '@/components/customization-builder/customization-category-rail';
import {CustomizationDimensionOption} from '@/components/customization-builder/customization-dimension-option';
import {CustomizationFinishOption} from '@/components/customization-builder/customization-finish-option';
import {CustomizationMaterialOption} from '@/components/customization-builder/customization-material-option';
import {CustomizationPrintOption} from '@/components/customization-builder/customization-print-option';
import {
    dimensionEntryNoteKey,
    getAnswer,
    type BuilderOption,
    type BuilderStep,
    type BuilderStepKey,
    type CustomizationBuilderState,
    type DimensionFace,
    type StepAnswer,
} from '@/lib/customization-builder';

type BuilderThreeColumnProps = {
    steps: BuilderStep[];
    activeKey: BuilderStepKey;
    activeTypeId: string | null;
    activeOptionId: string | null;
    state: CustomizationBuilderState;
    numberedRail?: boolean;
    maxReachableIndex?: number;
    header?: ReactNode;
    footer?: ReactNode;
    onSelectCategory: (key: BuilderStepKey) => void;
    onSelectConsultation: () => void;
    onSelectType: (typeId: string) => void;
    onSelectOption: (option: BuilderOption) => void;
    onAnswerChange: (key: BuilderStepKey, answer: StepAnswer) => void;
    onClearCategory?: (key: BuilderStepKey) => void;
    onEntryNoteChange: (entryKey: string, note: string) => void;
};

export function BuilderThreeColumn({
    steps,
    activeKey,
    activeTypeId,
    activeOptionId,
    state,
    numberedRail = false,
    maxReachableIndex,
    header,
    footer,
    onSelectCategory,
    onSelectConsultation,
    onSelectType,
    onSelectOption,
    onAnswerChange,
    onClearCategory,
    onEntryNoteChange,
}: BuilderThreeColumnProps) {
    const step = steps.find((item) => item.key === activeKey) ?? steps[0];
    if (!step) return null;

    const answer = getAnswer(state, step.key);
    const consultationSelected = answer.status === 'not-sure';
    const face: DimensionFace | null =
        step.kind === 'dimensions'
            ? activeTypeId === 'internal'
                ? 'internal'
                : activeTypeId === 'external'
                  ? 'external'
                  : null
            : null;
    const selectedOption = step.options.find(
        (item) => item.id === activeOptionId,
    );
    const entryNoteKey =
        step.kind === 'dimensions'
            ? face
                ? dimensionEntryNoteKey(face)
                : ''
            : (selectedOption?.id ?? '');
    const entryNote = entryNoteKey
        ? (state.entryNotes?.[entryNoteKey] ?? '')
        : '';

    const noteProps = {
        entryNote,
        onEntryNoteChange: (note: string) => {
            if (!entryNoteKey) return;
            onEntryNoteChange(entryNoteKey, note);
        },
    };

    return (
        <div className="flex min-h-0 flex-1 flex-col">
            {header}
            <div className="relative grid min-h-0 flex-1 overflow-hidden md:grid-cols-[220px_minmax(300px,1.15fr)_minmax(0,1.85fr)]">
                <div className="min-h-0 overflow-y-auto border-b border-border bg-muted/30 md:border-b-0 md:border-r">
                    <CustomizationCategoryRail
                        steps={steps}
                        activeKey={activeKey}
                        state={state}
                        numbered={numberedRail}
                        maxReachableIndex={maxReachableIndex}
                        onSelect={onSelectCategory}
                        onClearCategory={onClearCategory}
                    />
                </div>
                <CategoryTypeList
                    kind={step.kind}
                    types={step.types}
                    options={step.options}
                    activeTypeId={activeTypeId}
                    activeOptionId={activeOptionId}
                    consultationSelected={consultationSelected}
                    onSelectConsultation={onSelectConsultation}
                    onSelectType={onSelectType}
                    onSelectOption={onSelectOption}
                />
                <div className="min-h-0 min-w-0 overflow-y-auto px-5 py-5">
                    {step.kind === 'dimensions' ? (
                        <CustomizationDimensionOption
                            answer={answer}
                            face={face}
                            onChange={(next) => onAnswerChange(step.key, next)}
                            {...noteProps}
                        />
                    ) : step.key === 'material' ? (
                        <CustomizationMaterialOption
                            option={selectedOption}
                            consultationSelected={consultationSelected}
                            {...noteProps}
                        />
                    ) : step.key === 'print' ? (
                        <CustomizationPrintOption
                            option={selectedOption}
                            consultationSelected={consultationSelected}
                            {...noteProps}
                        />
                    ) : (
                        <CustomizationFinishOption
                            option={selectedOption}
                            consultationSelected={consultationSelected}
                            {...noteProps}
                        />
                    )}
                </div>
            </div>
            {footer}
        </div>
    );
}
