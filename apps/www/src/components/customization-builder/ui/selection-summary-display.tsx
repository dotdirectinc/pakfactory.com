'use client';

import type {CSSProperties} from 'react';
import {cn} from '@pakfactory/ui/lib/utils';
import {
    answerSelections,
    summarizeAnswer,
    visiblePropertySummaries,
    type PropertySummariesByOption,
    type StepAnswer,
} from '@/lib/customization-builder';

type SelectionSummaryDisplayProps = {
    answer: StepAnswer;
    specialistLabel: string;
    /** Option id → Property summary items (`state.propertySelectionSummaries`). */
    propertySummaries?: PropertySummariesByOption;
    className?: string;
};

/**
 * Picked option titles + mini swatch circles / chip text for rail & overview — every pick in
 * the step, comma-separated. Consultation items are omitted from the front (still in payload).
 */
export function SelectionSummaryDisplay({
    answer,
    specialistLabel,
    propertySummaries,
    className,
}: SelectionSummaryDisplayProps) {
    if (answer.status === 'unset') {
        return (
            <span className={className}>{summarizeAnswer(answer, specialistLabel)}</span>
        );
    }
    if (answer.status === 'not-sure' || 'dimensions' in answer) {
        return (
            <span className={cn('truncate', className)}>
                {summarizeAnswer(answer, specialistLabel)}
            </span>
        );
    }

    const text = summarizeAnswer(answer, specialistLabel, {propertySummaries});
    const swatches = answerSelections(answer).flatMap((pick) =>
        visiblePropertySummaries(propertySummaries?.[pick.optionId]).filter(
            (item) => item.kind === 'swatch',
        ),
    );

    return (
        <span
            className={cn(
                'inline-flex min-w-0 max-w-full items-center gap-2',
                className,
            )}
        >
            <span className="min-w-0 truncate">{text}</span>
            {swatches.length > 0 ? (
                <span className="flex shrink-0 items-center gap-1">
                    {swatches.map((item, index) => (
                        <MiniSwatch
                            key={`${item.label}-${index}`}
                            label={item.label}
                            color={item.color}
                            imageUrl={item.imageUrl}
                        />
                    ))}
                </span>
            ) : null}
        </span>
    );
}

function MiniSwatch({
    label,
    color,
    imageUrl,
}: {
    label: string;
    color?: string;
    imageUrl?: string;
}) {
    const style: CSSProperties = imageUrl
        ? {backgroundImage: `url(${imageUrl})`}
        : {backgroundColor: color ?? 'var(--muted)'};

    return (
        <span
            title={label}
            aria-label={label}
            className="size-3 shrink-0 rounded-full border border-border bg-cover bg-center"
            style={style}
        />
    );
}
