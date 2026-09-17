'use client';

import {useState} from 'react';
import {ChevronDown} from 'lucide-react';

import {Button} from '@pakfactory/ui/components/button';
import {Checkbox} from '@pakfactory/ui/components/checkbox';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@pakfactory/ui/components/collapsible';
import {Skeleton} from '@pakfactory/ui/components/skeleton';
import {cn} from '@pakfactory/ui/lib/utils';

import type {CustomizationFacetOption} from '@/lib/catalog/types';

/** First-load preview length so long facet lists do not crowd the rail. */
const FACET_OPTION_PREVIEW = 15;

/** Shared trailing column so counts sit centered under the chevron. */
const FACET_TRAILING_COL = 'w-7 shrink-0';

type CustomizationFacetGroupProps = {
    title: string;
    options: CustomizationFacetOption[];
    selected: string[];
    counts: Record<string, number>;
    onToggle: (value: string) => void;
    /** Optional helper under the title (e.g. Sustainability). */
    description?: string;
    defaultOpen?: boolean;
};

function hasSelectedBeyondPreview(
    options: CustomizationFacetOption[],
    selected: string[],
): boolean {
    if (selected.length === 0 || options.length <= FACET_OPTION_PREVIEW) {
        return false;
    }
    const previewValues = new Set(
        options.slice(0, FACET_OPTION_PREVIEW).map((opt) => opt.value),
    );
    return selected.some((value) => !previewValues.has(value));
}

export function CustomizationFacetGroup({
    title,
    options,
    selected,
    counts,
    onToggle,
    description,
    defaultOpen = true,
}: CustomizationFacetGroupProps) {
    const [expanded, setExpanded] = useState(() =>
        hasSelectedBeyondPreview(options, selected),
    );

    if (options.length === 0) return null;

    const hasOverflow = options.length > FACET_OPTION_PREVIEW;
    const visibleOptions =
        hasOverflow && !expanded
            ? options.slice(0, FACET_OPTION_PREVIEW)
            : options;

    return (
        <Collapsible defaultOpen={defaultOpen} className="flex flex-col gap-2">
            <CollapsibleTrigger className="flex w-full items-center gap-2 text-left outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring [&[data-state=open]_svg]:rotate-180">
                <span className="min-w-0 flex-1 text-sm font-semibold text-foreground">
                    {title}
                </span>
                <span
                    className={cn(
                        FACET_TRAILING_COL,
                        'flex justify-center text-muted-foreground',
                    )}
                >
                    <ChevronDown
                        className="size-4 shrink-0 transition-transform duration-300 ease-out motion-reduce:transition-none"
                        aria-hidden
                    />
                </span>
            </CollapsibleTrigger>
            <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
                {description ? (
                    <p className="pb-2 text-xs text-muted-foreground">
                        {description}
                    </p>
                ) : null}
                <ul className="flex flex-col gap-2 pt-1">
                    {visibleOptions.map((opt) => {
                        const id = `facet-${title}-${opt.value}`;
                        const checked = selected.includes(opt.value);
                        const count = counts[opt.value] ?? 0;
                        const disabled = count === 0 && !checked;
                        return (
                            <li key={opt.value}>
                                <label
                                    htmlFor={id}
                                    className={cn(
                                        'flex items-center gap-2',
                                        disabled
                                            ? 'cursor-not-allowed'
                                            : 'cursor-pointer',
                                    )}
                                >
                                    <Checkbox
                                        id={id}
                                        checked={checked}
                                        disabled={disabled}
                                        onCheckedChange={() => {
                                            if (disabled) return;
                                            onToggle(opt.value);
                                        }}
                                        aria-label={opt.label}
                                    />
                                    <span
                                        className={cn(
                                            'min-w-0 flex-1 truncate text-sm',
                                            disabled
                                                ? 'text-muted-foreground/50'
                                                : 'text-foreground',
                                        )}
                                    >
                                        {opt.label}
                                    </span>
                                    <span
                                        className={cn(
                                            FACET_TRAILING_COL,
                                            'text-center text-sm tabular-nums text-muted-foreground/50',
                                        )}
                                    >
                                        {count}
                                    </span>
                                </label>
                            </li>
                        );
                    })}
                </ul>
                {hasOverflow ? (
                    <Button
                        type="button"
                        variant="link"
                        size="sm"
                        className="mt-2 h-auto px-0 py-0 text-sm"
                        onClick={() => setExpanded((open) => !open)}
                        aria-expanded={expanded}
                    >
                        {expanded ? 'Show less' : 'Show more'}
                    </Button>
                ) : null}
            </CollapsibleContent>
        </Collapsible>
    );
}

type CustomizationFacetGroupSkeletonProps = {
    /** Placeholder checkbox rows under the title. */
    rowCount?: number;
};

/** Loading placeholder matching {@link CustomizationFacetGroup} rhythm. */
export function CustomizationFacetGroupSkeleton({
    rowCount = 4,
}: CustomizationFacetGroupSkeletonProps) {
    return (
        <div aria-hidden className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className={cn(FACET_TRAILING_COL, 'ml-auto h-4')} />
            </div>
            <ul className="flex flex-col gap-2 pt-1">
                {Array.from({length: rowCount}, (_, index) => (
                    <li key={index} className="flex items-center gap-2">
                        <Skeleton className="size-4 shrink-0 rounded-sm" />
                        <Skeleton className="h-4 min-w-0 flex-1" />
                        <Skeleton className={cn(FACET_TRAILING_COL, 'h-4')} />
                    </li>
                ))}
            </ul>
        </div>
    );
}
