'use client';

import {ChevronDown} from 'lucide-react';
import {Button} from '@pakfactory/ui/components/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@pakfactory/ui/components/dropdown-menu';
import {CUSTOMIZATION_BUILDER_COPY} from '@/components/customization-builder/copy';
import {
    getAnswer,
    isPrintingCategoryStep,
    summarizeAnswer,
    summarizePrintingStep,
    type BuilderStep,
    type BuilderStepKey,
    type CustomizationBuilderState,
} from '@/lib/customization-builder';
import type {PrintableSide} from '@/lib/customization-builder/printable-sides';

type GuidedStepMenuProps = {
    steps: BuilderStep[];
    activeKey: BuilderStepKey;
    maxReachableIndex: number;
    state: CustomizationBuilderState;
    printableSides?: PrintableSide[];
    onSelect: (key: BuilderStepKey) => void;
};

export function GuidedStepMenu({
    steps,
    activeKey,
    maxReachableIndex,
    state,
    printableSides = [],
    onSelect,
}: GuidedStepMenuProps) {
    const stepIndex = Math.max(
        0,
        steps.findIndex((item) => item.key === activeKey),
    );
    const step = steps[stepIndex];
    if (!step) return null;

    const triggerLabel = CUSTOMIZATION_BUILDER_COPY.stepMenu
        .replace('{label}', step.label)
        .replace('{current}', String(stepIndex + 1))
        .replace('{total}', String(steps.length));

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    type="button"
                    variant="ghost"
                    className="h-auto max-w-full justify-start self-start gap-1 px-0 py-0 text-left text-lg font-semibold tracking-tight text-foreground hover:bg-transparent has-[>svg]:px-0 focus-visible:border-transparent focus-visible:ring-0"
                >
                    <span className="min-w-0 truncate">{triggerLabel}</span>
                    <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
                align="start"
                className="z-[60] min-w-56"
            >
                {steps.map((item, index) => {
                    const locked = index > maxReachableIndex;
                    const answer = getAnswer(state, item.key);
                    const summary = isPrintingCategoryStep(item)
                        ? summarizePrintingStep(
                              state,
                              answer,
                              CUSTOMIZATION_BUILDER_COPY.specialistToAdvise,
                              {
                                  propertySummaries:
                                      state.propertySelectionSummaries,
                                  printableSides,
                              },
                          )
                        : summarizeAnswer(
                              answer,
                              CUSTOMIZATION_BUILDER_COPY.specialistToAdvise,
                              {
                                  propertySummaries:
                                      state.propertySelectionSummaries,
                              },
                          );
                    const showSummary = !locked && summary !== CUSTOMIZATION_BUILDER_COPY.notSet;

                    return (
                        <DropdownMenuItem
                            key={item.key}
                            disabled={locked}
                            onSelect={() => onSelect(item.key)}
                            className="flex items-baseline justify-between gap-4"
                        >
                            <span>
                                {index + 1}. {item.label}
                            </span>
                            {showSummary ? (
                                <span className="max-w-36 truncate text-xs text-muted-foreground">
                                    {summary}
                                </span>
                            ) : null}
                        </DropdownMenuItem>
                    );
                })}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
