'use client';

import {Check, XIcon} from 'lucide-react';
import {Button} from '@pakfactory/ui/components/button';
import {HighlightItem} from '@pakfactory/ui/components/highlight-item';
import {cn} from '@pakfactory/ui/lib/utils';
import {CUSTOMIZATION_BUILDER_COPY} from '@/components/customization-builder/copy';
import {
    getAnswer,
    isAnswerReady,
    summarizeAnswer,
    type BuilderStep,
    type BuilderStepKey,
    type CustomizationBuilderState,
} from '@/lib/customization-builder';

type CustomizationCategoryRailProps = {
    steps: BuilderStep[];
    activeKey: BuilderStepKey;
    state: CustomizationBuilderState;
    numbered?: boolean;
    /** Indices greater than this are locked (guided). Omit for workspace. */
    maxReachableIndex?: number;
    onSelect: (key: BuilderStepKey) => void;
    onClearCategory?: (key: BuilderStepKey) => void;
};

export function CustomizationCategoryRail({
    steps,
    activeKey,
    state,
    numbered = false,
    maxReachableIndex,
    onSelect,
    onClearCategory,
}: CustomizationCategoryRailProps) {
    return (
        <nav
            className="flex flex-row gap-1 overflow-x-auto px-2 py-3 lg:flex-col lg:overflow-visible"
            aria-label={CUSTOMIZATION_BUILDER_COPY.navLabel}
        >
            {steps.map((item, index) => {
                const active = item.key === activeKey;
                const locked =
                    maxReachableIndex !== undefined &&
                    index > maxReachableIndex;
                const answer = getAnswer(state, item.key);
                const ready = isAnswerReady(answer);
                const summary = summarizeAnswer(
                    answer,
                    CUSTOMIZATION_BUILDER_COPY.specialistToAdvise,
                );
                const showChip = ready && summary !== 'Not set';
                const showClear = Boolean(showChip && onClearCategory);

                return (
                    <div
                        key={item.key}
                        className="relative shrink-0 lg:w-full"
                    >
                        <HighlightItem
                            selected={active}
                            disabled={locked}
                            aria-disabled={locked || undefined}
                            aria-current={active ? 'step' : undefined}
                            onClick={() => {
                                if (locked) return;
                                onSelect(item.key);
                            }}
                            className={cn(
                                'w-full font-medium',
                                showClear && 'pr-8',
                                locked
                                    ? 'text-muted-foreground/50 hover:bg-transparent hover:text-muted-foreground/50'
                                    : active
                                      ? 'text-foreground'
                                      : 'text-muted-foreground hover:text-foreground',
                            )}
                        >
                            <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-2">
                                    {numbered ? (
                                        <div className="flex w-4 shrink-0 justify-center">
                                            {ready ? (
                                                <span
                                                    className="flex size-4 items-center justify-center rounded-full bg-brand-forest text-white"
                                                    aria-label={
                                                        CUSTOMIZATION_BUILDER_COPY.ready
                                                    }
                                                >
                                                    <Check
                                                        className="size-2.5"
                                                        strokeWidth={3}
                                                        aria-hidden
                                                    />
                                                </span>
                                            ) : (
                                                <span className="text-xs tabular-nums text-muted-foreground">
                                                    {index + 1}.
                                                </span>
                                            )}
                                        </div>
                                    ) : null}
                                    <span className="text-sm">{item.label}</span>
                                </div>
                                {showChip ? (
                                    <p
                                        className={cn(
                                            'max-w-full truncate text-xs font-normal text-muted-foreground',
                                            numbered && 'pl-6',
                                        )}
                                    >
                                        {summary}
                                    </p>
                                ) : !numbered ? (
                                    <p className="line-clamp-2 text-xs text-muted-foreground">
                                        {CUSTOMIZATION_BUILDER_COPY.notSet}
                                    </p>
                                ) : null}
                            </div>
                        </HighlightItem>
                        {showClear ? (
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon-xs"
                                disabled={locked}
                                className="absolute right-3 bottom-4 size-4 shrink-0 rounded-sm p-0 text-muted-foreground hover:bg-transparent hover:text-foreground"
                                aria-label={
                                    CUSTOMIZATION_BUILDER_COPY.removeSelection
                                }
                                onClick={() => {
                                    if (locked || !onClearCategory) return;
                                    onClearCategory(item.key);
                                }}
                            >
                                <XIcon className="size-3" />
                            </Button>
                        ) : null}
                    </div>
                );
            })}
        </nav>
    );
}
