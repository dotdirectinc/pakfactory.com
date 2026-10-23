'use client';

import {useEffect, useState, type ReactNode} from 'react';
import {ChevronLeft, ChevronRight} from 'lucide-react';
import {Button} from '@pakfactory/ui/components/button';
import {CategoryTypeList} from '@/components/customization-builder/category-type-list';
import {CustomizationCategoryRail} from '@/components/customization-builder/customization-category-rail';
import {CustomizationDimensionOption} from '@/components/customization-builder/customization-dimension-option';
import {CustomizationFinishOption} from '@/components/customization-builder/customization-finish-option';
import {OptionDetail} from '@/components/customization-builder/option-detail';
import {CUSTOMIZATION_BUILDER_COPY} from '@/components/customization-builder/copy';
import {PrintedSideGate} from '@/components/customization-builder/printed-side-gate';
import {Icon} from '@/components/ui/icon';
import type {PropertySelectionMap} from '@/components/customization/option-property-controllers';
import type {ProductDimensionRange} from '@/lib/catalog/types';
import {
    answerSelections,
    dimensionEntryNoteKey,
    getAnswer,
    isPrintingCategoryStep,
    wantsAnyPrint,
    type BuilderOption,
    type BuilderStep,
    type BuilderStepKey,
    type CustomColorReferenceImage,
    type CustomizationBuilderState,
    type DimensionFace,
    type PrintSideValue,
    type PropertySelectionSummaryItem,
    type StepAnswer,
} from '@/lib/customization-builder';
import type {PrintableSide} from '@/lib/customization-builder/printable-sides';
import {shouldShowPrintedSideGate} from '@/lib/customization-builder/printable-sides';

function DetailOpenReporter({
    open,
    onChange,
}: {
    open: boolean;
    onChange?: (open: boolean) => void;
}) {
    useEffect(() => {
        onChange?.(open);
    }, [open, onChange]);
    return null;
}

const CONSULTATION_PAGER_KEY = '__consultation';

type StackedPagerEntry =
    | {key: string; kind: 'option'; option: BuilderOption}
    | {key: string; kind: 'consultation'}
    | {key: string; kind: 'face'; face: DimensionFace};

function stackedPagerEntries(
    step: BuilderStep,
    selectedOptionIds: ReadonlySet<string>,
    disabledOptionIds?: ReadonlySet<string>,
): StackedPagerEntry[] {
    if (step.kind === 'dimensions') {
        return step.types.flatMap((type) =>
            type.id === 'external' || type.id === 'internal'
                ? [{key: type.id, kind: 'face' as const, face: type.id}]
                : [],
        );
    }

    const entries: StackedPagerEntry[] = [];
    for (const type of step.types) {
        for (const option of step.options) {
            if (option.typeId !== type.id) continue;
            const picked = selectedOptionIds.has(option.id);
            const disabled = Boolean(disabledOptionIds?.has(option.id));
            if (disabled && !picked) continue;
            entries.push({key: option.id, kind: 'option', option});
        }
    }
    entries.push({key: CONSULTATION_PAGER_KEY, kind: 'consultation'});
    return entries;
}

type BuilderThreeColumnProps = {
    steps: BuilderStep[];
    activeKey: BuilderStepKey;
    activeTypeId: string | null;
    activeOptionId: string | null;
    disabledOptionIds?: ReadonlySet<string>;
    state: CustomizationBuilderState;
    numberedRail?: boolean;
    maxReachableIndex?: number;
    header?: ReactNode;
    footer?: ReactNode | ((ctx: {detailOpen: boolean}) => ReactNode);
    dimensionRange?: ProductDimensionRange;
    dimensionInput?: string;
    dimensionAxisIds?: readonly string[];
    printableSides?: PrintableSide[];
    onSelectCategory: (key: BuilderStepKey) => void;
    onSelectConsultation: () => void;
    onSelectType: (typeId: string) => void;
    onSelectOption: (option: BuilderOption) => void;
    onAnswerChange: (key: BuilderStepKey, answer: StepAnswer) => void;
    onClearCategory?: (key: BuilderStepKey) => void;
    onEntryNoteChange: (entryKey: string, note: string) => void;
    onPropertySelectionsChange?: (
        optionId: string,
        selections: PropertySelectionMap,
        summaries: PropertySelectionSummaryItem[],
    ) => void;
    onPrintedSideChange?: (slug: string, next: PrintSideValue) => void;
    onPrintingConsultation?: () => void;
    /** Request draft id for Custom Color reference uploads. */
    draftId?: string;
    onCustomColorReferenceChange?: (
        optionId: string,
        propertyKey: string,
        image: CustomColorReferenceImage | null,
    ) => void;
    /**
     * `columns` is the desktop dialog. `stack` is the below-lg drawer: list
     * or a pushed detail screen (not both).
     */
    layout?: 'columns' | 'stack';
    /** Guided drawer hides the rail; workspace drawer keeps a vertical list. */
    showRail?: boolean;
    /** Stacked drill-in open — sheet header hides the step title on detail. */
    onDetailOpenChange?: (open: boolean) => void;
};

export function BuilderThreeColumn({
    steps,
    activeKey,
    activeTypeId,
    activeOptionId,
    disabledOptionIds,
    state,
    numberedRail = false,
    maxReachableIndex,
    header,
    footer,
    dimensionRange,
    dimensionInput,
    dimensionAxisIds,
    printableSides = [],
    onSelectCategory,
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
    layout = 'columns',
    showRail = true,
    onDetailOpenChange,
}: BuilderThreeColumnProps) {
    const [stackDetailOpen, setStackDetailOpen] = useState(false);
    const step = steps.find((item) => item.key === activeKey) ?? steps[0];

    useEffect(() => {
        setStackDetailOpen(false);
    }, [activeKey]);

    if (!step) return null;

    const answer = getAnswer(state, step.key);
    const printingStep = isPrintingCategoryStep(step);
    const consultationSelected = answer.status === 'not-sure';
    // Gate hidden or any Yes → Method / Color list.
    const methodsEligible = wantsAnyPrint(state, printableSides);
    const showPrintingOptions = printingStep && methodsEligible;
    // Alone under pills when no Yes; list owns the end card when methods show.
    const showGateConsultation = printingStep && !methodsEligible;
    const showGate =
        printingStep &&
        shouldShowPrintedSideGate(printableSides) &&
        onPrintedSideChange &&
        onPrintingConsultation;
    const face: DimensionFace | null =
        step.kind === 'dimensions'
            ? activeTypeId === 'internal'
                ? 'internal'
                : activeTypeId === 'external'
                  ? 'external'
                  : null
            : null;
    const selectedOptionIds = new Set(
        answerSelections(answer).map((item) => item.optionId),
    );
    // The detail panel shows the open pick. Browsing without picking shows nothing, so a note
    // or Property can never attach to an option that is not in the spec.
    const selectedOption = step.options.find(
        (item) =>
            item.id === activeOptionId && selectedOptionIds.has(item.id),
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

    const optionPropertySelections = selectedOption
        ? (state.propertySelections?.[selectedOption.id] ?? {})
        : undefined;

    const stacked = layout === 'stack';
    const canShowOptionDetail = !(printingStep && !showPrintingOptions);

    function handleSelectOption(option: BuilderOption) {
        const picked = selectedOptionIds.has(option.id);
        const isOpen = option.id === activeOptionId;
        onSelectOption(option);
        if (stacked) {
            setStackDetailOpen(!(picked && isOpen));
        }
    }

    function handleSelectType(typeId: string) {
        onSelectType(typeId);
        if (stacked) setStackDetailOpen(true);
    }

    function handleSelectConsultation() {
        onSelectConsultation();
        if (stacked && canShowOptionDetail) setStackDetailOpen(true);
    }

    function handlePageTo(entry: StackedPagerEntry) {
        if (entry.kind === 'option') {
            onSelectOption(entry.option);
        } else if (entry.kind === 'consultation') {
            onSelectConsultation();
        } else {
            onSelectType(entry.face);
        }
        if (stacked) setStackDetailOpen(true);
    }

    const rail = showRail ? (
        <CustomizationCategoryRail
            steps={steps}
            activeKey={activeKey}
            state={state}
            numbered={numberedRail}
            maxReachableIndex={maxReachableIndex}
            dimensionAxisIds={dimensionAxisIds}
            printableSides={printableSides}
            onSelect={onSelectCategory}
            onClearCategory={onClearCategory}
            stacked={stacked}
        />
    ) : null;

    const typeList = (
        <>
            {showGate ? (
                <div className="shrink-0">
                    <PrintedSideGate
                        sides={printableSides}
                        values={state.printedSides ?? {}}
                        onChange={onPrintedSideChange}
                        onNeedConsultation={onPrintingConsultation}
                        consultationSelected={
                            consultationSelected && showGateConsultation
                        }
                        showConsultation={showGateConsultation}
                    />
                </div>
            ) : null}
            {!printingStep || showPrintingOptions ? (
                <CategoryTypeList
                    key={step.key}
                    kind={step.kind}
                    types={step.types}
                    options={step.options}
                    activeTypeId={activeTypeId}
                    activeOptionId={activeOptionId}
                    selectedOptionIds={selectedOptionIds}
                    disabledOptionIds={disabledOptionIds}
                    consultationSelected={consultationSelected}
                    onSelectConsultation={handleSelectConsultation}
                    onSelectType={handleSelectType}
                    onSelectOption={handleSelectOption}
                    categoryLabel={step.label}
                    showOpenHint={stacked}
                    className={
                        stacked
                            ? 'overflow-visible border-0'
                            : printingStep
                              ? 'border-0 border-r-0 md:border-r-0'
                              : undefined
                    }
                />
            ) : null}
        </>
    );

    const detail =
        step.kind === 'dimensions' ? (
            <CustomizationDimensionOption
                answer={answer}
                face={face}
                dimensionInput={dimensionInput}
                dimensionRange={dimensionRange}
                compact={stacked}
                onChange={(next) => onAnswerChange(step.key, next)}
                {...noteProps}
            />
        ) : printingStep && !showPrintingOptions ? null : step.category ===
          'finishing' ? (
            <CustomizationFinishOption
                option={selectedOption}
                consultationSelected={consultationSelected}
                compact={stacked}
                propertySelections={optionPropertySelections}
                onPropertySelectionsChange={(selections, summaries) => {
                    if (!selectedOption) return;
                    onPropertySelectionsChange?.(
                        selectedOption.id,
                        selections,
                        summaries,
                    );
                }}
                draftId={draftId}
                customColorReferences={state.customColorReferences}
                onCustomColorReferenceChange={
                    selectedOption && onCustomColorReferenceChange
                        ? (propertyKey, image) =>
                              onCustomColorReferenceChange(
                                  selectedOption.id,
                                  propertyKey,
                                  image,
                              )
                        : undefined
                }
                {...noteProps}
            />
        ) : (
            <OptionDetail
                option={selectedOption}
                consultationSelected={consultationSelected}
                compact={stacked}
                propertySelections={optionPropertySelections}
                onPropertySelectionsChange={(selections, summaries) => {
                    if (!selectedOption) return;
                    onPropertySelectionsChange?.(
                        selectedOption.id,
                        selections,
                        summaries,
                    );
                }}
                draftId={draftId}
                customColorReferences={state.customColorReferences}
                onCustomColorReferenceChange={
                    selectedOption && onCustomColorReferenceChange
                        ? (propertyKey, image) =>
                              onCustomColorReferenceChange(
                                  selectedOption.id,
                                  propertyKey,
                                  image,
                              )
                        : undefined
                }
                {...noteProps}
            />
        );

    const hasDetailContent = Boolean(
        canShowOptionDetail &&
            (selectedOption || consultationSelected || face),
    );
    const detailOpen = stacked && stackDetailOpen && hasDetailContent;
    const detailTitle = consultationSelected
        ? CUSTOMIZATION_BUILDER_COPY.skipNotSure
        : selectedOption
          ? selectedOption.title
          : face === 'internal'
            ? CUSTOMIZATION_BUILDER_COPY.internal
            : face === 'external'
              ? CUSTOMIZATION_BUILDER_COPY.external
              : step.label;
    const pagerEntries = stacked
        ? stackedPagerEntries(step, selectedOptionIds, disabledOptionIds)
        : [];
    const pagerIndex = consultationSelected
        ? pagerEntries.findIndex((entry) => entry.kind === 'consultation')
        : selectedOption
          ? pagerEntries.findIndex(
                (entry) =>
                    entry.kind === 'option' &&
                    entry.option.id === selectedOption.id,
            )
          : face
            ? pagerEntries.findIndex(
                  (entry) => entry.kind === 'face' && entry.face === face,
              )
            : -1;
    const showPager = pagerEntries.length > 1 && pagerIndex >= 0;
    const canPagePrev = showPager && pagerIndex > 0;
    const canPageNext =
        showPager && pagerIndex < pagerEntries.length - 1;
    const footerNode =
        typeof footer === 'function' ? footer({detailOpen}) : footer;

    return (
        <div className="flex min-h-0 flex-1 flex-col">
            <DetailOpenReporter
                open={detailOpen}
                onChange={onDetailOpenChange}
            />
            {header}
            {stacked ? (
                detailOpen ? (
                    <div className="flex min-h-0 flex-1 flex-col">
                        <div className="grid h-16 shrink-0 grid-cols-[2.5rem_minmax(0,1fr)_2.5rem] items-center border-b border-border px-7">
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                className="justify-self-start"
                                aria-label={`${CUSTOMIZATION_BUILDER_COPY.back}: ${step.label}`}
                                onClick={() => setStackDetailOpen(false)}
                            >
                                <Icon icon={ChevronLeft} size="sm" />
                            </Button>
                            <div className="flex min-w-0 items-center justify-center gap-1">
                                {showPager ? (
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon-sm"
                                        disabled={!canPagePrev}
                                        aria-label={
                                            CUSTOMIZATION_BUILDER_COPY.previousOption
                                        }
                                        onClick={() => {
                                            const prev =
                                                pagerEntries[pagerIndex - 1];
                                            if (prev) handlePageTo(prev);
                                        }}
                                    >
                                        <Icon
                                            icon={ChevronLeft}
                                            size="sm"
                                        />
                                    </Button>
                                ) : null}
                                <span className="min-w-0 truncate text-center text-sm font-medium text-foreground">
                                    {detailTitle}
                                </span>
                                {showPager ? (
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon-sm"
                                        disabled={!canPageNext}
                                        aria-label={
                                            CUSTOMIZATION_BUILDER_COPY.nextOption
                                        }
                                        onClick={() => {
                                            const next =
                                                pagerEntries[pagerIndex + 1];
                                            if (next) handlePageTo(next);
                                        }}
                                    >
                                        <Icon
                                            icon={ChevronRight}
                                            size="sm"
                                        />
                                    </Button>
                                ) : null}
                            </div>
                            <span aria-hidden className="size-8 justify-self-end" />
                        </div>
                        <div className="min-h-0 flex-1 overflow-y-auto px-7 py-5 animate-in slide-in-from-right fill-mode-both duration-[var(--motion-fast)] motion-reduce:animate-none">
                            {detail}
                        </div>
                    </div>
                ) : (
                    <div className="min-h-0 flex-1 overflow-y-auto">
                        {rail ? (
                            <div className="border-b border-border bg-muted/30">
                                {rail}
                            </div>
                        ) : null}
                        {typeList}
                    </div>
                )
            ) : (
                <div className="relative grid min-h-0 flex-1 overflow-hidden md:grid-cols-[220px_minmax(300px,1.15fr)_minmax(0,1.85fr)]">
                    <div className="min-h-0 overflow-y-auto border-b border-border bg-muted/30 md:border-b-0 md:border-r">
                        {rail}
                    </div>
                    <div className="flex min-h-0 min-w-0 flex-col overflow-y-auto border-b border-border md:border-b-0 md:border-r">
                        {typeList}
                    </div>
                    <div className="min-h-0 min-w-0 overflow-y-auto px-5 py-5">
                        {detail}
                    </div>
                </div>
            )}
            {footerNode}
        </div>
    );
}
