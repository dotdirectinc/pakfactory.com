'use client';

import {X} from 'lucide-react';

import {Button} from '@pakfactory/ui/components/button';
import {
    Drawer,
    DrawerClose,
    DrawerContent,
    DrawerFooter,
    DrawerHeader,
    DrawerTitle,
} from '@pakfactory/ui/components/drawer';
import {cn} from '@pakfactory/ui/lib/utils';

import {CustomizationFacetGroup} from '@/components/customization/customization-facet-group';
import type {
    CustomizationFacetDef,
    CustomizationFacetOption,
} from '@/lib/catalog/types';

type CustomizationCatalogFiltersDrawerProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    resultCount: number;
    category: string;
    categoryOptions: CustomizationFacetOption[];
    categoryCounts: Record<string, number>;
    onSelectCategory: (next: string) => void;
    sharedFacets: CustomizationFacetDef[];
    categoryFacets: CustomizationFacetDef[];
    selections: Record<string, string[]>;
    countsByFacet: Record<string, Record<string, number>>;
    onToggle: (facetId: string, value: string) => void;
    onReset: () => void;
    showCategoryHint?: boolean;
};

export function CustomizationCatalogFiltersDrawer({
    open,
    onOpenChange,
    resultCount,
    category,
    categoryOptions,
    categoryCounts,
    onSelectCategory,
    sharedFacets,
    categoryFacets,
    selections,
    countsByFacet,
    onToggle,
    onReset,
    showCategoryHint = false,
}: CustomizationCatalogFiltersDrawerProps) {
    const visibleFacets = [...sharedFacets, ...categoryFacets].filter(
        (facet) => facet.options.length > 0,
    );

    const resultLabel =
        resultCount === 1
            ? 'Show 1 customization'
            : `Show ${resultCount} customizations`;

    return (
        <Drawer open={open} onOpenChange={onOpenChange}>
            <DrawerContent className="max-h-[90dvh]">
                <DrawerHeader className="relative border-b border-border text-left">
                    <DrawerTitle className="pr-10 text-center text-lg">
                        Filters
                    </DrawerTitle>
                    <DrawerClose asChild>
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-3 top-3 size-9"
                            aria-label="Close filters"
                        >
                            <X className="size-5" />
                        </Button>
                    </DrawerClose>
                </DrawerHeader>

                <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 py-4">
                    <div
                        className={cn(
                            'pb-5',
                            visibleFacets.length > 0 &&
                                'border-b border-dashed border-border',
                        )}
                    >
                        <CustomizationFacetGroup
                            title="Category"
                            options={categoryOptions}
                            selected={[category]}
                            counts={categoryCounts}
                            onToggle={(value) => {
                                if (value !== category) {
                                    onSelectCategory(value);
                                }
                            }}
                            defaultOpen
                        />
                    </div>
                    {visibleFacets.map((facet, index) => (
                        <div
                            key={facet.id}
                            className={cn(
                                'pb-5',
                                index < visibleFacets.length - 1 &&
                                    'border-b border-dashed border-border',
                            )}
                        >
                            <CustomizationFacetGroup
                                title={facet.title}
                                options={facet.options}
                                selected={selections[facet.id] ?? []}
                                counts={countsByFacet[facet.id] ?? {}}
                                onToggle={(value) => onToggle(facet.id, value)}
                                defaultOpen
                            />
                        </div>
                    ))}
                    {showCategoryHint ? (
                        <p className="text-xs text-muted-foreground">
                            More attribute filters appear once you pick a
                            category.
                        </p>
                    ) : null}
                </div>

                <DrawerFooter className="flex-row items-center gap-4 border-t border-border">
                    <Button
                        type="button"
                        variant="link"
                        className="h-auto px-0"
                        onClick={onReset}
                    >
                        Clear all
                    </Button>
                    <Button
                        type="button"
                        className="ml-auto"
                        onClick={() => onOpenChange(false)}
                    >
                        {resultLabel}
                    </Button>
                </DrawerFooter>
            </DrawerContent>
        </Drawer>
    );
}
