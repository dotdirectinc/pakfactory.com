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
import type {CatalogOptionLike} from '@/lib/customization-builder';
import {
    buildStepsFromCatalog,
    clearStep,
    createEmptyBuilderState,
    fillUnsetWithConsultation,
    getAnswer,
    markGuidedComplete,
    patchAnswer,
    patchEntryNote,
    shouldEnterGuided,
    type BuilderMode,
    type BuilderOption,
    type BuilderStep,
    type BuilderStepKey,
    type CustomizationBuilderState,
    type StepAnswer,
} from '@/lib/customization-builder';

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
};

function restoreTypeId(
    step: BuilderStep | undefined,
    state: CustomizationBuilderState,
): string | null {
    if (!step) return null;
    const answer = getAnswer(state, step.key);
    if (step.kind === 'selection') {
        if (answer.status === 'set' && 'selection' in answer) {
            return answer.selection.typeId || null;
        }
        return null;
    }
    // Dimensions: never preselect External/Internal from answer alone.
    return null;
}

function restoreOptionId(
    step: BuilderStep | undefined,
    state: CustomizationBuilderState,
): string | null {
    if (!step || step.kind !== 'selection') return null;
    const answer = getAnswer(state, step.key);
    if (answer.status === 'set' && 'selection' in answer) {
        return answer.selection.optionId || null;
    }
    return null;
}

export function CustomizationBuilder({
    open,
    onOpenChange,
    availableCustomizations,
    value,
    onChange,
    productTitle,
    initialStepKey,
}: CustomizationBuilderProps) {
    const steps = useMemo(
        () => buildStepsFromCatalog(availableCustomizations),
        [availableCustomizations],
    );

    const [mode, setMode] = useState<BuilderMode>('guided');
    const [activeKey, setActiveKey] = useState<BuilderStepKey>('dimensions');
    const [activeTypeId, setActiveTypeId] = useState<string | null>(null);
    const [activeOptionId, setActiveOptionId] = useState<string | null>(null);
    const [guidedJustFinished, setGuidedJustFinished] = useState(false);

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

    function selectOption(option: BuilderOption) {
        setActiveOptionId(option.id);
        setActiveTypeId(option.typeId);
        onChange(
            patchAnswer(value, activeKey, {
                status: 'set',
                selection: {
                    typeId: option.typeId,
                    optionId: option.id,
                    label: option.title,
                },
            }),
        );
    }

    useEffect(() => {
        if (!open) return;
        const enterGuided = shouldEnterGuided(value);
        setMode(enterGuided ? 'guided' : 'workspace');
        setGuidedJustFinished(false);
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
        selectCategory(next.key);
    }

    function finishGuided(state: CustomizationBuilderState = value) {
        onChange(markGuidedComplete(state, steps));
        setMode('workspace');
        setGuidedJustFinished(true);
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
                            state={value}
                            onSelectStep={selectCategory}
                            onSelectConsultation={selectConsultation}
                            onSelectType={selectType}
                            onSelectOption={selectOption}
                            onAnswerChange={handleAnswerChange}
                            onClearCategory={handleClearCategory}
                            onEntryNoteChange={handleEntryNoteChange}
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
                            state={value}
                            showFinishedBanner={guidedJustFinished}
                            onSelectStep={selectCategory}
                            onSelectConsultation={selectConsultation}
                            onSelectType={selectType}
                            onSelectOption={selectOption}
                            onAnswerChange={handleAnswerChange}
                            onClearCategory={handleClearCategory}
                            onEntryNoteChange={handleEntryNoteChange}
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
