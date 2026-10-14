'use client';

import type {ReactNode} from 'react';
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from '@pakfactory/ui/components/tabs';
import {cn} from '@pakfactory/ui/lib/utils';

export type CatalogTab = {
    id: string;
    label: string;
};

type CatalogTabBarProps = {
    tabs: CatalogTab[];
    value: string;
    onValueChange?: (id: string) => void;
    /** Right-hand controls on the tab rule (filters, view toggle). */
    actions?: ReactNode;
    /** Panel for the active tab. */
    children: ReactNode;
    'aria-label'?: string;
    className?: string;
};

/**
 * Underline sits ON the rule (2px, overlapping the 1px border), muted until
 * active — the primitive's offset `::after` bar is switched off for a real
 * bottom border.
 */
const TAB_TRIGGER_CLASS =
    'h-auto flex-none rounded-none border-0 border-b-2 border-transparent px-0 py-3.5 text-sm text-muted-foreground after:hidden hover:text-foreground data-[state=active]:border-b-foreground data-[state=active]:font-semibold data-[state=active]:text-foreground';

/**
 * Underline tabs on a full-width rule, with filter controls on the right —
 * the `@pakfactory/ui` Tabs primitive in its `line` variant. Props-only
 * (ADR-013): the caller owns which tab is active and what the panel shows.
 */
export function CatalogTabBar({
    tabs,
    value,
    onValueChange,
    actions,
    children,
    'aria-label': ariaLabel,
    className,
}: CatalogTabBarProps) {
    return (
        <Tabs
            value={value}
            onValueChange={onValueChange}
            className={cn('gap-0', className)}
        >
            <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2 border-b border-border">
                <TabsList
                    variant="line"
                    aria-label={ariaLabel}
                    className="-mb-px gap-7 p-0 group-data-[orientation=horizontal]/tabs:h-auto"
                >
                    {tabs.map((tab) => (
                        <TabsTrigger
                            key={tab.id}
                            value={tab.id}
                            className={TAB_TRIGGER_CLASS}
                        >
                            {tab.label}
                        </TabsTrigger>
                    ))}
                </TabsList>
                {actions ? (
                    <div className="flex flex-wrap items-center gap-3 pb-2">
                        {actions}
                    </div>
                ) : null}
            </div>
            <TabsContent value={value}>{children}</TabsContent>
        </Tabs>
    );
}
