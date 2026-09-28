'use client';

import {useEffect, useMemo, useState} from 'react';
import {Button} from '@pakfactory/ui/components/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@pakfactory/ui/components/dialog';
import {CustomizationGuidedView} from '@/components/customization-builder/customization-guided-view';
import {CustomizationWorkspaceView} from '@/components/customization-builder/customization-workspace-view';
import {CUSTOMIZATION_BUILDER_COPY} from '@/components/customization-builder/copy';
import type {CustomizationRulesSnapshot} from '@/lib/catalog/customization-rules';
import type {ProductDimensionRange} from '@/lib/catalog/types';
import type {CatalogOptionLike} from '@/lib/customization-builder';
import {narrowByRules} from '@/lib/customization-builder/rules-narrowing';
import {
    answerSelections,
    buildStepsFromCatalog,
    clearStep,
    createEmptyBuilderState,
    fillUnsetWithConsultation,
    getAnswer,
    markGuidedComplete,
    patchAnswer,
    patchEntryNote,
    patchPropertySelections,
    removeSelections,
    shouldEnterGuided,
    toggleSelection,
    type BuilderMode,
    type BuilderOption,
    type BuilderStep,
    type BuilderStepKey,
    type CustomizationBuilderState,
    type PropertySelectionSummaryItem,
    type StepAnswer,
} from '@/lib/customization-builder';
import type {PropertySelectionMap} from '@/components/customization/option-property-controllers';
import {resolveProductDims} from '@pakfactory/sanity/resolve-product-dims';

export type CustomizationBuilderProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    availableCustomizations: CatalogOptionLike[];
    /** Initial builder state (PDP draft or existing line). */
    value: CustomizationBuilderState;
    onChange: (next: CustomizationBuilderState) => void;
    productTitle?: string;
    /** When opening, focus this step (e.g. from overview summary row). */
    initialStepKey?: BuilderStepKey;
    /** Sanity product.dimensionInput shape key. */
    dimensionInput?: string;
    /** Sanity product dimensionRange in mm. */
    dimensionRange?: ProductDimensionRange;
    /**
     * The product's customization rules (PROD-2556). Narrows each step to what the other
     * answers still allow. Absent (production before its rebuild, or an older request
     * line) — the options are listed as given, with no narrowing.
     */
    customizationRules?: CustomizationRulesSnapshot | null;
};

/** The pick the detail panel reopens on: the most recent one in the step. */
function lastPick(step: BuilderStep | undefined, state: CustomizationBuilderState) {
    if (!step || step.kind !== 'selection') return undefined;
    return answerSelections(getAnswer(state, step.key)).at(-1);
}

function restoreTypeId(
    step: BuilderStep | undefined,
    state: CustomizationBuilderState,
): string | null {
    // Dimensions: never preselect External/Internal from answer alone.
    return lastPick(step, state)?.typeId || null;
}

function restoreOptionId(
    step: BuilderStep | undefined,
    state: CustomizationBuilderState,
): string | null {
    return lastPick(step, state)?.optionId || null;
}

export function CustomizationBuilder({
    open,
    onOpenChange,
    availableCustomizations,
    value,
    onChange,
    productTitle,
    initialStepKey,
    dimensionInput,
    dimensionRange,
    customizationRules,
}: CustomizationBuilderProps) {
    const dimensionAxisIds = useMemo(
        () =>
            resolveProductDims(dimensionInput ?? 'rectangular', dimensionRange)
                .axes,
        [dimensionInput, dimensionRange],
    );

    // Every pick in every step goes to the shared rules, which decide what can still be picked.
    // Everything the product offers stays listed; what the rules rule out is shown disabled,
    // so the customer sees the option exists and that their other choices exclude it.
    const narrowed = useMemo(
        () => narrowByRules(availableCustomizations, customizationRules, value),
        [availableCustomizations, customizationRules, value],
    );
    const disabledOptionIds = useMemo(() => {
        const pickable = new Set(narrowed.available.map((option) => option.id));
        return new Set(
            availableCustomizations
                .filter((option) => !pickable.has(option.id))
                .map((option) => option.id),
        );
    }, [availableCustomizations, narrowed]);

    const steps = useMemo(
        () => buildStepsFromCatalog(availableCustomizations),
        [availableCustomizations],
    );

    // Clear picks another pick has made impossible (e.g. a printing method the newly chosen
    // board cannot take). Silent, as designed; only that pick goes — the rest of its step stays.
    useEffect(() => {
        if (narrowed.invalidOptionIds.size === 0) return;
        const next = removeSelections(value, narrowed.invalidOptionIds);
        if (next !== value) onChange(next);
    }, [narrowed, value, onChange]);

    const [mode, setMode] = useState<BuilderMode>('guided');
    const [activeKey, setActiveKey] = useState<BuilderStepKey>('dimensions');
    const [activeTypeId, setActiveTypeId] = useState<string | null>(null);
    const [activeOptionId, setActiveOptionId] = useState<string | null>(null);
    /** Highest rail index unlocked by Next/Skip commit (guided only). */
    const [guidedMaxIndex, setGuidedMaxIndex] = useState(0);

    function selectCategory(key: BuilderStepKey) {
        const step = steps.find((item) => item.key === key);
        setActiveKey(key);
        setActiveTypeId(restoreTypeId(step, value));
        setActiveOptionId(restoreOptionId(step, value));
    }

    function selectConsultation() {
        setActiveOptionId(null);
        setActiveTypeId(null);
        onChange(patchAnswer(value, activeKey, {status: 'not-sure'}));
    }

    function selectType(typeId: string) {
        setActiveTypeId(typeId);
        setActiveOptionId(null);
        const answer = getAnswer(value, activeKey);
        if (answer.status === 'not-sure') {
            onChange(patchAnswer(value, activeKey, {status: 'unset'}));
        }
    }

    /**
     * Clicking an option picks it and opens its detail. Clicking a pick that is not open just
     * opens it (its Properties and note live there); clicking the open pick again un-picks it.
     * A `one` Type swaps its pick; a `many` Type adds to it (`customerSelects`).
     */
    function selectOption(option: BuilderOption) {
        const step = steps.find((item) => item.key === activeKey);
        const picked = answerSelections(getAnswer(value, activeKey)).some(
            (item) => item.optionId === option.id,
        );
        if (!picked && disabledOptionIds.has(option.id)) return;
        if (picked && activeOptionId !== option.id) {
            setActiveOptionId(option.id);
            setActiveTypeId(option.typeId);
            return;
        }
        const cardinality =
            step?.types.find((type) => type.id === option.typeId)?.cardinality ??
            'one';
        const next = toggleSelection(
            value,
            activeKey,
            {typeId: option.typeId, optionId: option.id, label: option.title},
            cardinality,
        );
        onChange(next);
        if (picked) {
            setActiveOptionId(restoreOptionId(step, next));
            setActiveTypeId(restoreTypeId(step, next));
        } else {
            setActiveOptionId(option.id);
            setActiveTypeId(option.typeId);
        }
    }

    useEffect(() => {
        if (!open) return;
        const enterGuided = shouldEnterGuided(value);
        setMode(enterGuided ? 'guided' : 'workspace');
        setGuidedMaxIndex(0);
        const focus =
            (initialStepKey
                ? steps.find((step) => step.key === initialStepKey)
                : undefined) ?? steps[0];
        setActiveKey(focus?.key ?? 'dimensions');
        setActiveTypeId(restoreTypeId(focus, value));
        setActiveOptionId(restoreOptionId(focus, value));
    }, [open]);

    useEffect(() => {
        const current = steps.find((step) => step.key === activeKey);
        if (!current && steps[0]) {
            setActiveKey(steps[0].key);
            setActiveTypeId(restoreTypeId(steps[0], value));
            setActiveOptionId(restoreOptionId(steps[0], value));
            return;
        }
        if (
            current &&
            activeTypeId &&
            !current.types.some((item) => item.id === activeTypeId)
        ) {
            setActiveTypeId(restoreTypeId(current, value));
        }
        if (
            current &&
            activeOptionId &&
            current.kind === 'selection' &&
            !current.options.some((item) => item.id === activeOptionId)
        ) {
            setActiveOptionId(restoreOptionId(current, value));
        }
    }, [steps, activeKey, activeTypeId, activeOptionId, value]);

    function handleAnswerChange(key: BuilderStepKey, answer: StepAnswer) {
        onChange(patchAnswer(value, key, answer));
        if (key !== activeKey) return;
        if (answer.status === 'not-sure' || answer.status === 'unset') {
            setActiveOptionId(null);
            setActiveTypeId(null);
        }
    }

    function handleClearCategory(key: BuilderStepKey) {
        onChange(clearStep(value, key));
        if (key !== activeKey) return;
        setActiveOptionId(null);
        setActiveTypeId(null);
    }

    function handleEntryNoteChange(entryKey: string, note: string) {
        onChange(patchEntryNote(value, entryKey, note));
    }

    function handlePropertySelectionsChange(
        optionId: string,
        selections: PropertySelectionMap,
        summaries: PropertySelectionSummaryItem[],
    ) {
        onChange(
            patchPropertySelections(value, optionId, selections, summaries),
        );
    }

    function goBack() {
        const index = steps.findIndex((step) => step.key === activeKey);
        const prev = index > 0 ? steps[index - 1] : undefined;
        if (!prev) return;
        selectCategory(prev.key);
    }

    function goNext() {
        const index = steps.findIndex((step) => step.key === activeKey);
        const next =
            index >= 0 && index < steps.length - 1
                ? steps[index + 1]
                : undefined;
        if (!next) return;
        setGuidedMaxIndex((max) => Math.max(max, index + 1));
        selectCategory(next.key);
    }

    function finishGuided(state: CustomizationBuilderState = value) {
        onChange(markGuidedComplete(state, steps));
        onOpenChange(false);
    }

    function handleSkip() {
        const next = patchAnswer(value, activeKey, {status: 'not-sure'});
        setActiveOptionId(null);
        setActiveTypeId(null);
        const index = steps.findIndex((step) => step.key === activeKey);
        const isLast = index >= steps.length - 1;
        if (isLast) {
            finishGuided(next);
            return;
        }
        setGuidedMaxIndex((max) => Math.max(max, index + 1));
        onChange(next);
        const following = steps[index + 1];
        if (!following) return;
        setActiveKey(following.key);
        setActiveTypeId(restoreTypeId(following, next));
        setActiveOptionId(restoreOptionId(following, next));
    }

    function handleSave() {
        onChange(
            fillUnsetWithConsultation(
                value,
                steps.map((step) => step.key),
            ),
        );
        onOpenChange(false);
    }

    const description =
        mode === 'guided'
            ? CUSTOMIZATION_BUILDER_COPY.guidedIntro
            : CUSTOMIZATION_BUILDER_COPY.workspaceIntro;

    const guidedStepIndex = Math.max(
        0,
        steps.findIndex((step) => step.key === activeKey),
    );
    const dialogTitle =
        mode === 'guided' && steps.length > 0
            ? `${CUSTOMIZATION_BUILDER_COPY.title} – ${CUSTOMIZATION_BUILDER_COPY.stepOf
                  .replace('{current}', String(guidedStepIndex + 1))
                  .replace('{total}', String(steps.length))}`
            : CUSTOMIZATION_BUILDER_COPY.title;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="flex h-[min(720px,85vh)] max-h-[85vh] w-full max-w-6xl flex-col gap-0 overflow-hidden p-0 sm:max-w-6xl">
                <DialogHeader className="shrink-0 border-b border-border px-5 py-4 pr-12 text-left">
                    <DialogTitle className="text-lg font-semibold tracking-tight">
                        {dialogTitle}
                    </DialogTitle>
                    <DialogDescription className="sr-only">
                        {productTitle
                            ? `${productTitle}. ${description}`
                            : description}
                    </DialogDescription>
                </DialogHeader>

                <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                    {mode === 'guided' ? (
                        <CustomizationGuidedView
                            steps={steps}
                            activeKey={activeKey}
                            activeTypeId={activeTypeId}
                            activeOptionId={activeOptionId}
                            disabledOptionIds={disabledOptionIds}
                            state={value}
                            maxReachableIndex={guidedMaxIndex}
                            dimensionInput={dimensionInput}
                            dimensionRange={dimensionRange}
                            dimensionAxisIds={dimensionAxisIds}
                            onSelectStep={selectCategory}
                            onSelectConsultation={selectConsultation}
                            onSelectType={selectType}
                            onSelectOption={selectOption}
                            onAnswerChange={handleAnswerChange}
                            onClearCategory={handleClearCategory}
                            onEntryNoteChange={handleEntryNoteChange}
                            onPropertySelectionsChange={
                                handlePropertySelectionsChange
                            }
                            onBack={goBack}
                            onNext={goNext}
                            onSkip={handleSkip}
                            onDone={() => finishGuided()}
                        />
                    ) : (
                        <CustomizationWorkspaceView
                            steps={steps}
                            activeKey={activeKey}
                            activeTypeId={activeTypeId}
                            activeOptionId={activeOptionId}
                            disabledOptionIds={disabledOptionIds}
                            state={value}
                            dimensionInput={dimensionInput}
                            dimensionRange={dimensionRange}
                            dimensionAxisIds={dimensionAxisIds}
                            onSelectStep={selectCategory}
                            onSelectConsultation={selectConsultation}
                            onSelectType={selectType}
                            onSelectOption={selectOption}
                            onAnswerChange={handleAnswerChange}
                            onClearCategory={handleClearCategory}
                            onEntryNoteChange={handleEntryNoteChange}
                            onPropertySelectionsChange={
                                handlePropertySelectionsChange
                            }
                        />
                    )}
                </div>

                {mode === 'workspace' ? (
                    <div className="flex shrink-0 justify-end border-t border-border px-6 py-4">
                        <Button type="button" size="lg" onClick={handleSave}>
                            {CUSTOMIZATION_BUILDER_COPY.save}
                        </Button>
                    </div>
                ) : null}
            </DialogContent>
        </Dialog>
    );
}

export function createBuilderDraft(
    seed?: CustomizationBuilderState,
): CustomizationBuilderState {
    return seed ?? createEmptyBuilderState();
}
