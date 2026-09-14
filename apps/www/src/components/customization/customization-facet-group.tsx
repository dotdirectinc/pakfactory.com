'use client';

import {ChevronDown} from 'lucide-react';

import {Checkbox} from '@pakfactory/ui/components/checkbox';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@pakfactory/ui/components/collapsible';
import {cn} from '@pakfactory/ui/lib/utils';

import type {CustomizationFacetOption} from '@/lib/catalog/types';

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

export function CustomizationFacetGroup({
    title,
    options,
    selected,
    counts,
    onToggle,
    description,
    defaultOpen = true,
}: CustomizationFacetGroupProps) {
    if (options.length === 0) return null;

    return (
        <Collapsible defaultOpen={defaultOpen} className="flex flex-col gap-2">
            <CollapsibleTrigger className="flex w-full items-center gap-2 text-left outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring [&[data-state=open]>svg]:rotate-180">
                <span className="min-w-0 flex-1 text-sm font-semibold text-foreground">
                    {title}
                </span>
                <ChevronDown
                    className="size-4 shrink-0 text-muted-foreground transition-transform"
                    aria-hidden
                />
            </CollapsibleTrigger>
            <CollapsibleContent>
                {description ? (
                    <p className="pb-2 text-xs text-muted-foreground">
                        {description}
                    </p>
                ) : null}
                <ul className="flex flex-col gap-2 pt-1">
                    {options.map((opt) => {
                        const id = `facet-${title}-${opt.value}`;
                        const checked = selected.includes(opt.value);
                        return (
                            <li key={opt.value}>
                                <label
                                    htmlFor={id}
                                    className="flex cursor-pointer items-center gap-2"
                                >
                                    <Checkbox
                                        id={id}
                                        checked={checked}
                                        onCheckedChange={() =>
                                            onToggle(opt.value)
                                        }
                                        aria-label={opt.label}
                                    />
                                    <span className="min-w-0 flex-1 truncate text-sm text-foreground">
                                        {opt.label}
                                    </span>
                                    <span
                                        className={cn(
                                            'min-w-7 shrink-0 text-right text-sm tabular-nums text-muted-foreground',
                                        )}
                                    >
                                        {counts[opt.value] ?? 0}
                                    </span>
                                </label>
                            </li>
                        );
                    })}
                </ul>
            </CollapsibleContent>
        </Collapsible>
    );
}
