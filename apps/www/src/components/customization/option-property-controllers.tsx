'use client';

import {useEffect, useId, useRef, useState} from 'react';
import {ChipField} from '@pakfactory/ui/components/customization/property-controller/chip-field';
import {PropertyFieldPanel} from '@pakfactory/ui/components/customization/property-controller/property-field-panel';
import {SwatchField} from '@pakfactory/ui/components/customization/property-controller/swatch-field';
import {Button} from '@pakfactory/ui/components/button';
import type {PropertyFieldDescriptor} from '@/lib/catalog/map-detail-to-property-fields';
import {isCustomColorSlug} from '@/lib/catalog/swatch-colors';
import type {PropertySelectionSummaryItem} from '@/lib/customization-builder';

/** Sentinel — not a Sanity catalog option id. */
export const PROPERTY_CONSULTATION_ID = '__consultation__';

const CUSTOM_COLOR_CONSULT_NOTE =
    'Our specialist will consult with you on your custom color.';

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
    appearance?: 'consultation' | 'customColor';
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
            ...(o.appearance === 'customColor'
                ? {appearance: 'customColor' as const}
                : {}),
        })),
    ];
}

function mapFieldOptions(
    options: PropertyFieldDescriptor['options'],
): DisplayOption[] {
    return options.map((o) => ({
        id: o.id,
        title: o.title,
        ...(o.imageUrl ? {imageUrl: o.imageUrl} : {}),
        ...(o.color ? {color: o.color} : {}),
        ...(o.appearance === 'customColor'
            ? {appearance: 'customColor' as const}
            : {}),
    }));
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

type CustomColorReferencePanelProps = {
    propertyKey: string;
};

/**
 * Client-only color reference upload (preview + filename).
 * Cleared when the parent unmounts (leaving Custom Color).
 */
function CustomColorReferencePanel({
    propertyKey,
}: CustomColorReferencePanelProps) {
    const inputId = useId();
    const inputRef = useRef<HTMLInputElement>(null);
    const [fileName, setFileName] = useState<string | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    useEffect(() => {
        return () => {
            if (previewUrl) URL.revokeObjectURL(previewUrl);
        };
    }, [previewUrl]);

    const clearFile = () => {
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
        setFileName(null);
        if (inputRef.current) inputRef.current.value = '';
    };

    return (
        <div
            className="mt-3 flex flex-col gap-3 rounded-[var(--radius-control)] border border-border bg-muted/40 p-3"
            data-custom-color-panel={propertyKey}
        >
            <p className="text-sm text-muted-foreground">
                {CUSTOM_COLOR_CONSULT_NOTE}
            </p>
            <div className="flex flex-wrap items-center gap-3">
                <input
                    ref={inputRef}
                    id={inputId}
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (!file) {
                            clearFile();
                            return;
                        }
                        if (previewUrl) URL.revokeObjectURL(previewUrl);
                        setFileName(file.name);
                        setPreviewUrl(URL.createObjectURL(file));
                    }}
                />
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => inputRef.current?.click()}
                >
                    {fileName ? 'Replace image' : 'Upload color reference'}
                </Button>
                {fileName ? (
                    <button
                        type="button"
                        className="text-sm text-muted-foreground underline-offset-4 hover:underline"
                        onClick={clearFile}
                    >
                        Remove
                    </button>
                ) : null}
            </div>
            {fileName || previewUrl ? (
                <div className="flex items-center gap-3">
                    {previewUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element -- local object URL preview
                        <img
                            src={previewUrl}
                            alt=""
                            className="size-12 shrink-0 rounded-[var(--radius-control)] border border-border object-cover"
                        />
                    ) : null}
                    {fileName ? (
                        <span className="min-w-0 truncate text-sm text-foreground">
                            {fileName}
                        </span>
                    ) : null}
                </div>
            ) : (
                <p className="text-xs text-muted-foreground">
                    PNG, JPG, or WebP — optional reference for your specialist.
                </p>
            )}
        </div>
    );
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
                    : mapFieldOptions(field.options);
                const selected = value[field.propertyKey] ?? [];
                const selectedId = selected[0];
                const selectedTitle = displayOptions.find(
                    (o) => o.id === selectedId,
                )?.title;
                const showCustomColorPanel =
                    typeof selectedId === 'string' &&
                    (isCustomColorSlug(selectedId) ||
                        displayOptions.find((o) => o.id === selectedId)
                            ?.appearance === 'customColor');

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
                            <>
                                <SwatchField
                                    swatches={displayOptions.map((o) => ({
                                        id: o.id,
                                        label: o.title,
                                        ...(o.appearance === 'consultation'
                                            ? {
                                                  appearance:
                                                      'consultation' as const,
                                              }
                                            : {}),
                                        ...(o.appearance === 'customColor'
                                            ? {
                                                  appearance:
                                                      'customColor' as const,
                                              }
                                            : {}),
                                        ...(o.imageUrl
                                            ? {imageUrl: o.imageUrl}
                                            : {}),
                                        ...(o.color ? {color: o.color} : {}),
                                    }))}
                                    value={selectedId}
                                    onChange={(id) => emitChange([id])}
                                />
                                {showCustomColorPanel ? (
                                    <CustomColorReferencePanel
                                        key={`${field.propertyKey}-custom`}
                                        propertyKey={field.propertyKey}
                                    />
                                ) : null}
                            </>
                        ) : (
                            <ChipField
                                chips={displayOptions.map((o) => ({
                                    id: o.id,
                                    label: o.title,
                                    ...(o.appearance === 'consultation'
                                        ? {
                                              appearance:
                                                  'consultation' as const,
                                          }
                                        : {}),
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
