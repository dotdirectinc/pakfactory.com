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
import {cn} from '@pakfactory/ui/lib/utils';

import type {CustomizationFacetOption} from '@/lib/catalog/types';

/** First-load preview length so long facet lists do not crowd the rail. */
const FACET_OPTION_PREVIEW = 15;

/** Shared trailing column so counts sit centered under the chevron. */
const FACET_TRAILING_COL = 'w-7 shrink-0';

type ProductLineFacetGroupProps = {
    title: string;
    options: CustomizationFacetOption[];
    selected: string[];
    counts: Record<string, number>;
    onToggle: (value: string) => void;
    /**
     * Styles for the single selected line. Empty / omitted when zero or
     * multiple lines are checked.
     */
    styleOptions?: CustomizationFacetOption[];
    selectedStyles?: string[];
    styleCounts?: Record<string, number>;
    onToggleStyle?: (value: string) => void;
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

type FacetOptionRowProps = {
    idPrefix: string;
    option: CustomizationFacetOption;
    checked: boolean;
    count: number;
    onToggle: (value: string) => void;
    indented?: boolean;
};

function FacetOptionRow({
    idPrefix,
    option,
    checked,
    count,
    onToggle,
    indented = false,
}: FacetOptionRowProps) {
    const id = `${idPrefix}-${option.value}`;
    const disabled = count === 0 && !checked;
    return (
        <label
            htmlFor={id}
            className={cn(
                'flex items-center gap-2',
                indented && 'pl-4',
                disabled ? 'cursor-not-allowed' : 'cursor-pointer',
            )}
        >
            <Checkbox
                id={id}
                checked={checked}
                disabled={disabled}
                onCheckedChange={() => {
                    if (disabled) return;
                    onToggle(option.value);
                }}
                aria-label={option.label}
            />
            <span
                className={cn(
                    'min-w-0 flex-1 truncate',
                    indented ? 'text-xs' : 'text-sm',
                    disabled
                        ? 'text-muted-foreground/50'
                        : 'text-foreground',
                )}
            >
                {option.label}
            </span>
            <span
                className={cn(
                    FACET_TRAILING_COL,
                    'text-center tabular-nums text-muted-foreground/50',
                    indented ? 'text-xs' : 'text-sm',
                )}
            >
                {count}
            </span>
        </label>
    );
}

/**
 * Product Line facet with optional nested Product Style children under the
 * single checked line (PROD-2599 phase A).
 */
export function ProductLineFacetGroup({
    title,
    options,
    selected,
    counts,
    onToggle,
    styleOptions = [],
    selectedStyles = [],
    styleCounts = {},
    onToggleStyle,
    defaultOpen = true,
}: ProductLineFacetGroupProps) {
    const [expanded, setExpanded] = useState(() =>
        hasSelectedBeyondPreview(options, selected),
    );
    const [stylesExpanded, setStylesExpanded] = useState(() =>
        hasSelectedBeyondPreview(styleOptions, selectedStyles),
    );

    if (options.length === 0) return null;

    const hasOverflow = options.length > FACET_OPTION_PREVIEW;
    const visibleOptions =
        hasOverflow && !expanded
            ? options.slice(0, FACET_OPTION_PREVIEW)
            : options;

    const singleLine =
        selected.length === 1 ? selected[0] : undefined;
    const showStyles =
        Boolean(singleLine) &&
        styleOptions.length > 0 &&
        typeof onToggleStyle === 'function';

    const styleOverflow = styleOptions.length > FACET_OPTION_PREVIEW;
    const visibleStyles =
        showStyles && styleOverflow && !stylesExpanded
            ? styleOptions.slice(0, FACET_OPTION_PREVIEW)
            : styleOptions;

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
                <ul className="flex flex-col gap-2 pt-1">
                    {visibleOptions.map((opt) => {
                        const isActiveLine = opt.value === singleLine;
                        return (
                            <li key={opt.value} className="flex flex-col gap-2">
                                <FacetOptionRow
                                    idPrefix={`facet-${title}`}
                                    option={opt}
                                    checked={selected.includes(opt.value)}
                                    count={counts[opt.value] ?? 0}
                                    onToggle={onToggle}
                                />
                                {showStyles && isActiveLine ? (
                                    <ul
                                        className="ml-2 flex flex-col gap-2 border-l border-border pl-2"
                                        aria-label={`${opt.label} product styles`}
                                    >
                                        {visibleStyles.map((style) => (
                                            <li key={style.value}>
                                                <FacetOptionRow
                                                    idPrefix={`facet-style-${opt.value}`}
                                                    option={style}
                                                    checked={selectedStyles.includes(
                                                        style.value,
                                                    )}
                                                    count={
                                                        styleCounts[
                                                            style.value
                                                        ] ?? 0
                                                    }
                                                    onToggle={onToggleStyle!}
                                                    indented
                                                />
                                            </li>
                                        ))}
                                        {styleOverflow ? (
                                            <li className="pl-4">
                                                <Button
                                                    type="button"
                                                    variant="link"
                                                    size="sm"
                                                    className="h-auto px-0 py-0 text-sm"
                                                    onClick={() =>
                                                        setStylesExpanded(
                                                            (open) => !open,
                                                        )
                                                    }
                                                    aria-expanded={
                                                        stylesExpanded
                                                    }
                                                >
                                                    {stylesExpanded
                                                        ? 'Show less'
                                                        : 'Show more'}
                                                </Button>
                                            </li>
                                        ) : null}
                                    </ul>
                                ) : null}
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
