'use client';

import {ChipField} from '@pakfactory/ui/components/customization/property-controller/chip-field';
import {PropertyFieldPanel} from '@pakfactory/ui/components/customization/property-controller/property-field-panel';
import {SwatchField} from '@pakfactory/ui/components/customization/property-controller/swatch-field';
import type {PropertyFieldDescriptor} from '@/lib/catalog/map-detail-to-property-fields';
import type {PropertySelectionSummaryItem} from '@/lib/customization-builder';

/** Sentinel — not a Sanity catalog option id. */
export const PROPERTY_CONSULTATION_ID = '__consultation__';

export type PropertySelectionMap = Record<string, string[]>;

type OptionPropertyControllersProps = {
    fields: PropertyFieldDescriptor[];
    value: PropertySelectionMap;
    onChange: (propertyKey: string, ids: string[]) => void;
    /** Forwarded to PropertyFieldPanel; builder uses ghost. */
    variant?: 'card' | 'ghost';
    /**
     * Builder only: prepend Need consultation and treat it as exclusive
     * with real catalog values.
     */
    consultationDefault?: boolean;
    /** Label for the synthetic consultation control. */
    consultationLabel?: string;
};

type DisplayOption = {
    id: string;
    title: string;
    imageUrl?: string;
    color?: string;
    appearance?: 'consultation';
};

function withConsultationOption(
    options: PropertyFieldDescriptor['options'],
    label: string,
): DisplayOption[] {
    return [
        {
            id: PROPERTY_CONSULTATION_ID,
            title: label,
            appearance: 'consultation',
        },
        ...options.map((o) => ({
            id: o.id,
            title: o.title,
            ...(o.imageUrl ? {imageUrl: o.imageUrl} : {}),
            ...(o.color ? {color: o.color} : {}),
        })),
    ];
}

function normalizeSelection(
    ids: string[],
    previous: string[],
    consultationDefault: boolean,
): string[] {
    if (!consultationDefault) return ids;
    const hadConsultation = previous.includes(PROPERTY_CONSULTATION_ID);
    const hasConsultation = ids.includes(PROPERTY_CONSULTATION_ID);
    const real = ids.filter((id) => id !== PROPERTY_CONSULTATION_ID);

    // Newly chose consultation (or consultation alone) → exclusive sentinel.
    if (hasConsultation && (!hadConsultation || real.length === 0)) {
        return [PROPERTY_CONSULTATION_ID];
    }
    return real;
}

/**
 * Selectable Property controllers for an Option (Chip / Swatch).
 * Shared by customization detail and the product builder.
 */
export function OptionPropertyControllers({
    fields,
    value,
    onChange,
    variant = 'card',
    consultationDefault = false,
    consultationLabel = 'Need consultation',
}: OptionPropertyControllersProps) {
    if (fields.length === 0) return null;

    return (
        <div className="flex flex-col gap-4">
            {fields.map((field) => {
                const displayOptions: DisplayOption[] = consultationDefault
                    ? withConsultationOption(field.options, consultationLabel)
                    : field.options.map((o) => ({
                          id: o.id,
                          title: o.title,
                          ...(o.imageUrl ? {imageUrl: o.imageUrl} : {}),
                          ...(o.color ? {color: o.color} : {}),
                      }));
                const selected = value[field.propertyKey] ?? [];
                const selectedTitle = displayOptions.find(
                    (o) => o.id === selected[0],
                )?.title;

                const emitChange = (ids: string[]) => {
                    onChange(
                        field.propertyKey,
                        normalizeSelection(
                            ids,
                            selected,
                            consultationDefault,
                        ),
                    );
                };

                return (
                    <PropertyFieldPanel
                        key={field.propertyKey}
                        title={field.label}
                        {...(selectedTitle
                            ? {titleValue: selectedTitle}
                            : {})}
                        variant={variant}
                    >
                        {field.kind === 'swatch' ? (
                            <SwatchField
                                swatches={displayOptions.map((o) => ({
                                    id: o.id,
                                    label: o.title,
                                    ...(o.appearance === 'consultation'
                                        ? {appearance: 'consultation' as const}
                                        : {}),
                                    ...(o.imageUrl ? {imageUrl: o.imageUrl} : {}),
                                    ...(o.color ? {color: o.color} : {}),
                                }))}
                                value={selected[0]}
                                onChange={(id) => emitChange([id])}
                            />
                        ) : (
                            <ChipField
                                chips={displayOptions.map((o) => ({
                                    id: o.id,
                                    label: o.title,
                                }))}
                                valuesPerItem={field.valuesPerItem}
                                value={selected}
                                onChange={emitChange}
                            />
                        )}
                    </PropertyFieldPanel>
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

/** Builder: each property starts on Need consultation. */
export function initialConsultationPropertySelection(
    fields: PropertyFieldDescriptor[],
): PropertySelectionMap {
    const next: PropertySelectionMap = {};
    for (const field of fields) {
        next[field.propertyKey] = [PROPERTY_CONSULTATION_ID];
    }
    return next;
}

export function isPropertyConsultationSelection(
    ids: string[] | undefined,
): boolean {
    return Boolean(ids?.includes(PROPERTY_CONSULTATION_ID));
}

/** Ordered summary items for rail / overview (consultation marked omitFromSummary). */
export function summariesForPropertySelection(
    fields: PropertyFieldDescriptor[],
    selection: PropertySelectionMap,
    consultationLabel = 'Need consultation',
): PropertySelectionSummaryItem[] {
    const items: PropertySelectionSummaryItem[] = [];
    for (const field of fields) {
        const ids = selection[field.propertyKey] ?? [];
        for (const id of ids) {
            if (id === PROPERTY_CONSULTATION_ID) {
                items.push({
                    kind: field.kind,
                    label: consultationLabel,
                    omitFromSummary: true,
                });
                continue;
            }
            const option = field.options.find((o) => o.id === id);
            if (!option) continue;
            items.push({
                kind: field.kind,
                label: option.title,
                omitFromSummary: false,
                ...(option.color ? {color: option.color} : {}),
                ...(option.imageUrl ? {imageUrl: option.imageUrl} : {}),
            });
        }
    }
    return items;
}
