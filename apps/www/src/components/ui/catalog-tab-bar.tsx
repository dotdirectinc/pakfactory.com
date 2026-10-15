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
    /** Shown muted beside the label, as in the customization catalog. */
    count?: number;
};

type CatalogTabBarProps = {
    tabs: CatalogTab[];
    value: string;
    onValueChange?: (id: string) => void;
    /** Right-hand controls on the strip (e.g. the list/grid toggle). */
    actions?: ReactNode;
    /** Panel for the active tab. */
    children: ReactNode;
    'aria-label'?: string;
    className?: string;
    /** Panel wrapper (spacing below the strip). */
    panelClassName?: string;
};

/**
 * Same strip as the customization catalog: tab label + muted count, a 4px
 * primary bar under the active tab, the primitive's own offset `::after` bar
 * switched off for a real bottom border.
 */
const TAB_TRIGGER_CLASS =
    'h-auto flex-none gap-2 rounded-none border-0 border-b-4 border-transparent px-0 py-4 text-sm font-medium text-muted-foreground shadow-none after:hidden hover:text-primary data-[state=active]:border-b-primary data-[state=active]:text-primary data-[state=active]:shadow-none';

/**
 * Catalog tab strip: full width of the section (it bleeds through the inner
 * gutter to the dieline), dashed rule, sticky under the site header, actions
 * on the right. Built on the `@pakfactory/ui` Tabs primitive (`line`
 * variant). Props-only (ADR-013): the caller owns the active tab and panel.
 */
export function CatalogTabBar({
    tabs,
    value,
    onValueChange,
    actions,
    children,
    'aria-label': ariaLabel,
    className,
    panelClassName,
}: CatalogTabBarProps) {
    return (
        <Tabs
            value={value}
            onValueChange={onValueChange}
            className={cn('gap-0', className)}
        >
            <div className="sticky top-16 z-30 -mx-layout-gutter-inner border-b border-dashed border-border bg-background">
                <div className="flex items-stretch justify-between gap-x-4 px-layout-gutter-inner sm:gap-x-6">
                    <TabsList
                        variant="line"
                        aria-label={ariaLabel}
                        className="-mb-px min-w-0 flex-1 justify-start gap-x-4 overflow-x-auto p-0 group-data-[orientation=horizontal]/tabs:h-auto sm:gap-x-6"
                    >
                        {tabs.map((tab) => (
                            <TabsTrigger
                                key={tab.id}
                                value={tab.id}
                                className={TAB_TRIGGER_CLASS}
                            >
                                <span>{tab.label}</span>
                                {tab.count != null ? (
                                    <span className="font-normal tabular-nums text-muted-foreground/50">
                                        {tab.count}
                                    </span>
                                ) : null}
                            </TabsTrigger>
                        ))}
                    </TabsList>
                    {actions ? (
                        <div className="flex shrink-0 items-center gap-1 py-2">
                            {actions}
                        </div>
                    ) : null}
                </div>
            </div>
            <TabsContent value={value} className={panelClassName}>
                {children}
            </TabsContent>
        </Tabs>
    );
}
