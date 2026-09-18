'use client';

import {ChipField} from '@pakfactory/ui/components/customization/property-controller/chip-field';
import {SwatchField} from '@pakfactory/ui/components/customization/property-controller/swatch-field';
import type {PropertyFieldDescriptor} from '@/lib/catalog/map-detail-to-property-fields';

export type PropertySelectionMap = Record<string, string[]>;

type OptionPropertyControllersProps = {
    fields: PropertyFieldDescriptor[];
    value: PropertySelectionMap;
    onChange: (propertyKey: string, ids: string[]) => void;
};

/**
 * Selectable Property controllers for an Option (Chip / Swatch).
 * Shared by customization detail and the product builder.
 */
export function OptionPropertyControllers({
    fields,
    value,
    onChange,
}: OptionPropertyControllersProps) {
    if (fields.length === 0) return null;

    return (
        <div className="flex flex-col gap-4">
            {fields.map((field) => {
                const selected = value[field.propertyKey] ?? [];
                return (
                    <section
                        key={field.propertyKey}
                        className="overflow-hidden rounded-control border border-border bg-card"
                    >
                        <header className="border-b border-border bg-muted px-4 py-2">
                            <h3 className="text-sm font-semibold tracking-tight text-foreground">
                                {field.label}
                            </h3>
                        </header>
                        <div className="flex flex-col gap-2 p-4">
                            {field.kind === 'swatch' ? (
                                <SwatchField
                                    swatches={field.options.map((o) => ({
                                        id: o.id,
                                        label: o.title,
                                        ...(o.imageUrl
                                            ? {imageUrl: o.imageUrl}
                                            : {}),
                                    }))}
                                    value={selected[0]}
                                    onChange={(id) =>
                                        onChange(field.propertyKey, [id])
                                    }
                                />
                            ) : (
                                <ChipField
                                    chips={field.options.map((o) => ({
                                        id: o.id,
                                        label: o.title,
                                    }))}
                                    valuesPerItem={field.valuesPerItem}
                                    value={selected}
                                    onChange={(ids) =>
                                        onChange(field.propertyKey, ids)
                                    }
                                />
                            )}
                        </div>
                    </section>
                );
            })}
        </div>
    );
}

export function initialPropertySelection(
    fields: PropertyFieldDescriptor[],
): PropertySelectionMap {
    const next: PropertySelectionMap = {};
    for (const field of fields) {
        const first = field.options[0]?.id;
        next[field.propertyKey] = first ? [first] : [];
    }
    return next;
}
