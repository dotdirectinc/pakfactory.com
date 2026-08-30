'use client';

import {useMemo, useState} from 'react';

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@pakfactory/ui/components/select';
import {
    PageDielineSection,
} from '@pakfactory/ui/components/page-dieline-section';
import {cn} from '@pakfactory/ui/lib/utils';

import {CapabilityCatalogList} from '@/components/capability/capability-catalog-list';
import type {CapabilityCardItem} from '@/components/capability/capability-card';
import type {
    CapabilityCatalogItem,
    CapabilityCatalogTab,
} from '@/components/capability/capability-catalog-view';

const MATERIAL_TYPE_OPTIONS = [
    {value: 'paperboard', label: 'Paperboard'},
    {value: 'chipboard', label: 'Chipboard'},
] as const;

const MATERIAL_SUSTAINABILITY_OPTIONS = [
    {value: 'recycled-fiber', label: 'Recycled Fiber'},
    {value: 'virgin-fiber', label: 'Virgin Fiber'},
] as const;

const FINISH_TYPE_OPTIONS = [
    {value: 'lamination', label: 'Lamination'},
    {value: 'coating', label: 'Coating'},
] as const;

const FINISH_SUSTAINABILITY_OPTIONS = [
    {value: 'low-voc-emission', label: 'Low VOC Emission'},
    {value: 'compostable', label: 'Compostable'},
] as const;

type CapabilityCatalogPanelProps = {
    tabs: CapabilityCatalogTab[];
    items: CapabilityCatalogItem[];
};

export function CapabilityCatalogPanel({
    tabs,
    items,
}: CapabilityCatalogPanelProps) {
    const [active, setActive] = useState<CapabilityCatalogTab['value']>(
        tabs[0]?.value ?? 'material',
    );

    const {typeOptions, sustainabilityOptions} = useMemo(() => {
        if (active === 'material') {
            return {
                typeOptions: [...MATERIAL_TYPE_OPTIONS],
                sustainabilityOptions: [...MATERIAL_SUSTAINABILITY_OPTIONS],
            };
        }
        return {
            typeOptions: [...FINISH_TYPE_OPTIONS],
            sustainabilityOptions: [...FINISH_SUSTAINABILITY_OPTIONS],
        };
    }, [active]);

    const filtered = useMemo<CapabilityCardItem[]>(() => {
        return items
            .filter((item) => item.category === active)
            .map((item) => ({
                _id: item._id,
                title: item.title,
                slug: item.slug,
                categoryValue: item.category,
                categoryLabel: tabs.find((t) => t.value === item.category)
                    ?.label,
                imageUrl: item.imageUrl ?? null,
                imageAlt: item.imageAlt ?? item.title,
            }));
    }, [items, active, tabs]);

    return (
        <PageDielineSection innerClassName="pb-24 pt-8">
            <div className="mb-8 flex flex-wrap items-center gap-2">
                {tabs.map((tab) => {
                    const isActive = tab.value === active;
                    return (
                        <button
                            key={tab.value}
                            type="button"
                            onClick={() => setActive(tab.value)}
                            className={cn(
                                'rounded-full px-4 py-2 text-sm font-semibold transition-colors',
                                isActive
                                    ? 'bg-black text-white'
                                    : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                            )}
                            aria-pressed={isActive}
                        >
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <FilterSelect
                    key={`${active}-type`}
                    label="Type"
                    placeholder="Select type"
                    options={typeOptions}
                />
                <FilterSelect
                    label="Color"
                    placeholder="Filter by color"
                    options={[
                        {value: 'natural', label: 'Natural'},
                        {value: 'white', label: 'White'},
                        {value: 'black', label: 'Black'},
                    ]}
                />
                <FilterSelect
                    key={`${active}-sustainability`}
                    label="Sustainability"
                    placeholder="Select sustainability"
                    options={sustainabilityOptions}
                />
            </div>

            <div className="mt-6">
                <CapabilityCatalogList items={filtered} />
            </div>
        </PageDielineSection>
    );
}

function FilterSelect({
    label,
    placeholder,
    options,
}: {
    label: string;
    placeholder: string;
    options: {value: string; label: string}[];
}) {
    return (
        <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-muted-foreground">
                {label}
            </span>
            <Select>
                <SelectTrigger className="w-full">
                    <SelectValue placeholder={placeholder} />
                </SelectTrigger>
                <SelectContent>
                    {options.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
}
