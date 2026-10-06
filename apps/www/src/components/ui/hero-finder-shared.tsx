'use client';

import type {ReactNode} from 'react';
import {CheckIcon, ChevronDownIcon} from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@pakfactory/ui/components/dropdown-menu';
import {cn} from '@pakfactory/ui/lib/utils';

export type FinderPickerOption = {id: string; title: string};

/**
 * Inline muted chip picker used inside the Finder H1 sentence
 * ("Custom [line] for [industry] brands."). Shared by simple + fullscreen.
 *
 * Non-modal DropdownMenu — Radix Select's RemoveScroll shifts the page
 * despite `scrollbar-gutter: stable` (same fix as Brief Builder country).
 */
export function FinderPicker({
    label,
    value,
    valueLabel,
    options,
    onChange,
    className,
}: {
    label: string;
    value: string;
    valueLabel: string;
    options: FinderPickerOption[];
    onChange: (id: string) => void;
    className?: string;
}) {
    return (
        <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
                <button
                    type="button"
                    aria-label={`${label}: ${valueLabel}`}
                    className={cn(
                        'inline-flex h-auto max-w-full min-w-0 cursor-pointer items-baseline gap-1 rounded-[length:var(--radius-control)] border-0 bg-muted px-2 py-0 align-baseline font-[inherit] text-[length:inherit] leading-[inherit] tracking-[inherit] text-foreground shadow-none outline-none hover:bg-muted/80 sm:gap-2',
                        'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                        className,
                    )}
                >
                    <span className="min-w-0 truncate">{valueLabel}</span>
                    <ChevronDownIcon
                        className="size-[0.5em] shrink-0 text-foreground opacity-100"
                        aria-hidden
                    />
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="min-w-48">
                {options.map((option) => {
                    const selected = option.id === value;
                    return (
                        <DropdownMenuItem
                            key={option.id}
                            onSelect={() => onChange(option.id)}
                            className={cn(
                                'relative cursor-pointer py-1.5 pr-2 pl-8',
                                selected && 'font-medium',
                            )}
                        >
                            {selected ? (
                                <span className="pointer-events-none absolute left-2 flex size-3.5 items-center justify-center">
                                    <CheckIcon className="size-4" aria-hidden />
                                </span>
                            ) : null}
                            {option.title}
                        </DropdownMenuItem>
                    );
                })}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

/**
 * Finder H1: "Custom [line] for [industry] brands."
 * Mobile: lead + line picker share one flex row (picker truncates); industry
 * line always stacks below. `sm+`: inline lead+picker, then second line.
 */
export function buildFinderHeadingTitle({
    headingLead,
    headingJoin,
    headingTrail,
    line,
    industry,
    lineOptions,
    industryOptions,
    onLineChange,
    onIndustryChange,
}: {
    headingLead: string;
    headingJoin: string;
    headingTrail?: string;
    line: {slug: string; title: string};
    industry: {slug: string; title: string};
    lineOptions: FinderPickerOption[];
    industryOptions: FinderPickerOption[];
    onLineChange: (slug: string) => void;
    onIndustryChange: (slug: string) => void;
}): ReactNode {
    return (
        <>
            <span className="flex max-w-full items-baseline gap-x-2 sm:inline">
                <span className="shrink-0">{headingLead}</span>
                <FinderPicker
                    label="Product line"
                    value={line.slug}
                    valueLabel={line.title}
                    options={lineOptions}
                    onChange={onLineChange}
                    className="min-w-0 flex-1 sm:inline-flex sm:flex-none"
                />
            </span>
            <span className="mt-1 block sm:mt-2">
                {headingJoin}{' '}
                <FinderPicker
                    label="Industry"
                    value={industry.slug}
                    valueLabel={industry.title}
                    options={industryOptions}
                    onChange={onIndustryChange}
                />
                {headingTrail ? <> {headingTrail}</> : null}
            </span>
        </>
    );
}
