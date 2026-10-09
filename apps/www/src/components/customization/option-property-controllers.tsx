'use client';

import {
    useEffect,
    useId,
    useMemo,
    useRef,
    useState,
    type ReactNode,
} from 'react';
import {CardGridField} from '@pakfactory/ui/components/customization/property-controller/card-grid-field';
import {ChipField} from '@pakfactory/ui/components/customization/property-controller/chip-field';
import {DimensionField} from '@pakfactory/ui/components/customization/property-controller/dimension-field';
import {ListboxField} from '@pakfactory/ui/components/customization/property-controller/listbox-field';
import {PropertyFieldPanel} from '@pakfactory/ui/components/customization/property-controller/property-field-panel';
import {RadioField} from '@pakfactory/ui/components/customization/property-controller/radio-field';
import {RadioPickField} from '@pakfactory/ui/components/customization/property-controller/radio-pick-field';
import {ReadonlyField} from '@pakfactory/ui/components/customization/property-controller/readonly-field';
import {SpecTableField} from '@pakfactory/ui/components/customization/property-controller/spec-table-field';
import {SwatchField} from '@pakfactory/ui/components/customization/property-controller/swatch-field';
import {TogglesField} from '@pakfactory/ui/components/customization/property-controller/toggles-field';
import type {DimensionFieldValue} from '@pakfactory/ui/components/customization/types';
import {Button} from '@pakfactory/ui/components/button';
import {resolveProductDims} from '@pakfactory/sanity/resolve-product-dims';
import {dimensionAxesFor} from '@pakfactory/utilities/dimension-axes';
import {convertDimensionRangeToUnit} from '@pakfactory/utilities/length-units';
import {PantonePropertyControllers} from '@/components/customization-builder/pantone-property-controllers';
import {
    defaultPantoneSelection,
    hasPantoneSelection,
    PANTONE_COUNT_KEY,
    PANTONE_PMS_KEY,
} from '@/components/customization-builder/pantone-property';
import type {
    PropertyFieldDescriptor,
    PropertyFieldOption,
} from '@/lib/catalog/map-detail-to-property-fields';
import {summaryKindForField} from '@/lib/catalog/map-detail-to-property-fields';
import {isCustomColorSlug} from '@/lib/catalog/swatch-colors';
import type {ProductDimensionRange} from '@/lib/catalog/types';
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
    /**
     * Full-map updates (Pantone count + codes). When omitted, pantone calls
     * `onChange` once per key with functional-safe parents.
     */
    onMapChange?: (next: PropertySelectionMap) => void;
    /** Forwarded to PropertyFieldPanel; builder uses ghost. */
    variant?: 'card' | 'ghost';
    /**
     * Builder only: prepend Need consultation and treat it as exclusive
     * with real catalog values.
     */
    consultationDefault?: boolean;
    /** Label for the synthetic consultation control. */
    consultationLabel?: string;
    /** Product shape for `dimension` controls; omit → no-shape (unsure only). */
    dimensionInput?: string;
    dimensionRange?: ProductDimensionRange;
    dimensionUnit?: 'in' | 'mm';
};

function encodeDimensionValue(value: DimensionFieldValue): string {
    return JSON.stringify(value);
}

function decodeDimensionValue(
    raw: string | undefined,
    axes: {id: string}[],
): DimensionFieldValue {
    const empty = Object.fromEntries(axes.map((a) => [a.id, '']));
    if (!raw) return {unsure: false, values: empty};
    try {
        const parsed = JSON.parse(raw) as DimensionFieldValue;
        if (
            typeof parsed === 'object' &&
            parsed != null &&
            typeof parsed.unsure === 'boolean' &&
            typeof parsed.values === 'object' &&
            parsed.values != null
        ) {
            return {
                unsure: parsed.unsure,
                values: {...empty, ...parsed.values},
            };
        }
    } catch {
        /* ignore */
    }
    return {unsure: false, values: empty};
}

function summarizeDimensionValue(raw: string | undefined): string {
    if (!raw) return '—';
    try {
        const parsed = JSON.parse(raw) as DimensionFieldValue;
        if (parsed.unsure) return 'Not sure';
        const parts = Object.values(parsed.values ?? {}).filter((v) =>
            String(v).trim(),
        );
        return parts.length > 0 ? parts.join(' × ') : '—';
    } catch {
        return '—';
    }
}

type DisplayOption = {
    id: string;
    title: string;
    imageUrl?: string;
    color?: string;
    appearance?: 'consultation' | 'customColor';
    kindOfSlug?: string;
    kindOfTitle?: string;
    facts?: PropertyFieldOption['facts'];
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
        ...mapFieldOptions(options),
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
        ...(o.kindOfSlug ? {kindOfSlug: o.kindOfSlug} : {}),
        ...(o.kindOfTitle ? {kindOfTitle: o.kindOfTitle} : {}),
        ...(o.facts ? {facts: o.facts} : {}),
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

function toSwatchItems(options: DisplayOption[]) {
    return options.map((o) => ({
        id: o.id,
        label: o.title,
        ...(o.appearance === 'consultation'
            ? {appearance: 'consultation' as const}
            : {}),
        ...(o.appearance === 'customColor'
            ? {appearance: 'customColor' as const}
            : {}),
        ...(o.imageUrl ? {imageUrl: o.imageUrl} : {}),
        ...(o.color ? {color: o.color} : {}),
    }));
}

function slugByTitle(options: DisplayOption[]): Map<string, string> {
    return new Map(options.map((o) => [o.title, o.id]));
}

function titleBySlug(options: DisplayOption[]): Map<string, string> {
    return new Map(options.map((o) => [o.id, o.title]));
}

function SwatchShadesField({
    options,
    selectedId,
    onSelect,
}: {
    options: DisplayOption[];
    selectedId: string | undefined;
    onSelect: (id: string) => void;
}) {
    const catalog = useMemo(() => {
        const clean = options.filter((o) => o.id !== PROPERTY_CONSULTATION_ID);
        const shades = clean.filter((o) => o.kindOfSlug);
        const headingIds = new Set(
            clean.filter((o) => !o.kindOfSlug).map((o) => o.id),
        );
        for (const shade of shades) {
            if (shade.kindOfSlug) headingIds.add(shade.kindOfSlug);
        }
        const headings = clean.filter(
            (o) => headingIds.has(o.id) && !o.kindOfSlug,
        );
        const present = new Set(headings.map((h) => h.id));
        for (const shade of shades) {
            const key = shade.kindOfSlug!;
            if (present.has(key)) continue;
            headings.push({
                id: key,
                title: shade.kindOfTitle ?? key,
            });
            present.add(key);
        }
        const shadesByHeading = new Map<string, DisplayOption[]>();
        for (const shade of shades) {
            const key = shade.kindOfSlug!;
            const list = shadesByHeading.get(key) ?? [];
            list.push(shade);
            shadesByHeading.set(key, list);
        }
        return {headings, shadesByHeading};
    }, [options]);

    const {headings, shadesByHeading} = catalog;

    const headingFromSelection = useMemo(() => {
        const selected = options.find((o) => o.id === selectedId);
        if (selected?.kindOfSlug) return selected.kindOfSlug;
        if (selectedId && headings.some((h) => h.id === selectedId)) {
            return selectedId;
        }
        return undefined;
    }, [options, selectedId, headings]);

    const [activeHeadingId, setActiveHeadingId] = useState<string | undefined>(
        () => headingFromSelection,
    );

    useEffect(() => {
        if (headingFromSelection) {
            setActiveHeadingId(headingFromSelection);
        }
    }, [headingFromSelection]);

    const shadeRow = activeHeadingId
        ? (shadesByHeading.get(activeHeadingId) ?? [])
        : [];

    const headingHasShades = shadeRow.length > 0;
    const shadeSelected =
        Boolean(selectedId) &&
        shadeRow.some((s) => s.id === selectedId);

    return (
        <div className="flex flex-col gap-3">
            <SwatchField
                swatches={toSwatchItems(headings)}
                value={activeHeadingId}
                showCheckBadge={!headingHasShades}
                onChange={(id) => {
                    setActiveHeadingId(id);
                    const shades = shadesByHeading.get(id) ?? [];
                    onSelect(shades[0]?.id ?? id);
                }}
            />
            {headingHasShades ? (
                <SwatchField
                    swatches={toSwatchItems(shadeRow)}
                    value={shadeSelected ? selectedId : shadeRow[0]?.id}
                    showCheckBadge
                    onChange={onSelect}
                />
            ) : null}
        </div>
    );
}

function SpecTableFromOptions({
    options,
    selectedId,
    onSelect,
}: {
    options: DisplayOption[];
    selectedId: string | undefined;
    onSelect: (id: string) => void;
}) {
    const segments = options.map((o) => ({id: o.id, label: o.title}));
    const columns: string[] = [];
    const seen = new Set<string>();
    for (const o of options) {
        for (const fact of o.facts ?? []) {
            if (seen.has(fact.label)) continue;
            seen.add(fact.label);
            columns.push(fact.label);
        }
    }
    const rows: Record<string, string[]> = {};
    for (const o of options) {
        const byLabel = new Map((o.facts ?? []).map((f) => [f.label, f.display]));
        rows[o.id] = columns.map((c) => byLabel.get(c) ?? '—');
    }

    if (segments.length === 0) return null;

    return (
        <SpecTableField
            segments={segments}
            columns={columns.length > 0 ? columns : ['Value']}
            rows={
                columns.length > 0
                    ? rows
                    : Object.fromEntries(
                          options.map((o) => [o.id, [o.title]]),
                      )
            }
            value={selectedId ?? segments[0]?.id}
            onChange={onSelect}
        />
    );
}

function TogglesFromOptions({
    options,
    selected,
    valuesPerItem,
    onChange,
}: {
    options: DisplayOption[];
    selected: string[];
    valuesPerItem: 'one' | 'many';
    onChange: (ids: string[]) => void;
}) {
    const items = options.map((o) => ({
        label: o.title,
        value: selected.includes(o.id),
    }));

    return (
        <TogglesField
            items={items}
            value={items.map((i) => i.value)}
            onChange={(next) => {
                if (valuesPerItem === 'one') {
                    const turnedOn = next.findIndex(
                        (on, i) => on && !selected.includes(options[i]!.id),
                    );
                    if (turnedOn >= 0) {
                        onChange([options[turnedOn]!.id]);
                        return;
                    }
                    onChange(
                        next
                            .map((on, i) => (on ? options[i]!.id : null))
                            .filter((id): id is string => Boolean(id)),
                    );
                    return;
                }
                onChange(
                    next
                        .map((on, i) => (on ? options[i]!.id : null))
                        .filter((id): id is string => Boolean(id)),
                );
            }}
        />
    );
}

/**
 * Selectable Property controllers for an Option.
 * Shared by customization detail and the product builder.
 */
export function OptionPropertyControllers({
    fields,
    value,
    onChange,
    onMapChange,
    variant = 'card',
    consultationDefault = false,
    consultationLabel = 'Need consultation',
    dimensionInput,
    dimensionRange,
    dimensionUnit = 'in',
}: OptionPropertyControllersProps) {
    if (fields.length === 0) return null;

    return (
        <div className="flex flex-col gap-6">
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

                const titles = titleBySlug(displayOptions);
                const slugs = slugByTitle(displayOptions);
                const choiceTitles = displayOptions
                    .filter((o) => o.id !== PROPERTY_CONSULTATION_ID)
                    .map((o) => o.title);

                let body: ReactNode = null;

                switch (field.kind) {
                    case 'swatch':
                        body = (
                            <>
                                <SwatchField
                                    swatches={toSwatchItems(displayOptions)}
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
                        );
                        break;
                    case 'swatchShades':
                        body = (
                            <SwatchShadesField
                                options={displayOptions.filter(
                                    (o) => o.id !== PROPERTY_CONSULTATION_ID,
                                )}
                                selectedId={selectedId}
                                onSelect={(id) => emitChange([id])}
                            />
                        );
                        break;
                    case 'chip':
                        body = (
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
                        );
                        break;
                    case 'radio':
                        body = (
                            <RadioField
                                choices={choiceTitles}
                                value={
                                    selectedId
                                        ? (titles.get(selectedId) ?? '')
                                        : ''
                                }
                                onChange={(title) => {
                                    const id = slugs.get(title);
                                    if (id) emitChange([id]);
                                }}
                            />
                        );
                        break;
                    case 'radioPick': {
                        const stock =
                            choiceTitles.find((t) =>
                                /stock/i.test(t),
                            ) ?? choiceTitles[0];
                        const custom =
                            choiceTitles.find((t) =>
                                /custom/i.test(t),
                            ) ?? choiceTitles[1];
                        body = (
                            <RadioPickField
                                choices={choiceTitles}
                                pick={[]}
                                unit="in"
                                value={
                                    selectedId
                                        ? (titles.get(selectedId) ?? '')
                                        : ''
                                }
                                revealPick={stock}
                                revealDimensions={custom}
                                onChange={(title) => {
                                    const id = slugs.get(title);
                                    if (id) emitChange([id]);
                                }}
                            />
                        );
                        break;
                    }
                    case 'listbox':
                        body = (
                            <ListboxField
                                choices={choiceTitles}
                                multi={field.valuesPerItem === 'many'}
                                value={selected
                                    .map((id) => titles.get(id))
                                    .filter((t): t is string => Boolean(t))}
                                onChange={(titlesNext) => {
                                    emitChange(
                                        titlesNext
                                            .map((t) => slugs.get(t))
                                            .filter((id): id is string =>
                                                Boolean(id),
                                            ),
                                    );
                                }}
                            />
                        );
                        break;
                    case 'card':
                        body = (
                            <CardGridField
                                cards={displayOptions
                                    .filter(
                                        (o) =>
                                            o.id !== PROPERTY_CONSULTATION_ID,
                                    )
                                    .map((o) => ({
                                        id: o.id,
                                        name: o.title,
                                        ...(o.facts?.[0]?.display
                                            ? {meta: o.facts[0].display}
                                            : {}),
                                        ...(o.imageUrl
                                            ? {
                                                  imageUrl: o.imageUrl,
                                                  ...(o.imageAlt
                                                      ? {imageAlt: o.imageAlt}
                                                      : {}),
                                              }
                                            : {}),
                                    }))}
                                value={selectedId}
                                onChange={(id) => emitChange([id])}
                            />
                        );
                        break;
                    case 'toggles':
                        body = (
                            <TogglesFromOptions
                                options={displayOptions.filter(
                                    (o) => o.id !== PROPERTY_CONSULTATION_ID,
                                )}
                                selected={selected}
                                valuesPerItem={field.valuesPerItem}
                                onChange={emitChange}
                            />
                        );
                        break;
                    case 'readonly':
                        body = (
                            <ReadonlyField
                                value={
                                    selectedTitle ??
                                    displayOptions.find(
                                        (o) =>
                                            o.id !== PROPERTY_CONSULTATION_ID,
                                    )?.title ??
                                    ''
                                }
                            />
                        );
                        break;
                    case 'specTable':
                        body = (
                            <SpecTableFromOptions
                                options={displayOptions.filter(
                                    (o) => o.id !== PROPERTY_CONSULTATION_ID,
                                )}
                                selectedId={selectedId}
                                onSelect={(id) => emitChange([id])}
                            />
                        );
                        break;
                    case 'pantone': {
                        const pantoneValue = hasPantoneSelection(value)
                            ? value
                            : {...value, ...defaultPantoneSelection()};
                        body = (
                            <PantonePropertyControllers
                                value={pantoneValue}
                                variant={variant}
                                onChange={(next) => {
                                    if (onMapChange) {
                                        onMapChange(next);
                                        return;
                                    }
                                    const count = next[PANTONE_COUNT_KEY];
                                    const codes = next[PANTONE_PMS_KEY];
                                    if (count) onChange(PANTONE_COUNT_KEY, count);
                                    if (codes) onChange(PANTONE_PMS_KEY, codes);
                                }}
                            />
                        );
                        break;
                    }
                    case 'dimension': {
                        const shape = dimensionInput?.trim() || 'no-shape';
                        const {axes: axisIds} = resolveProductDims(
                            shape,
                            dimensionRange,
                        );
                        const axes = dimensionAxesFor(axisIds);
                        const ranges = convertDimensionRangeToUnit(
                            dimensionRange,
                            dimensionUnit,
                            axisIds,
                        );
                        const dimValue = decodeDimensionValue(
                            selectedId,
                            axes,
                        );
                        body = (
                            <DimensionField
                                unit={dimensionUnit}
                                axes={axes}
                                ranges={ranges}
                                value={dimValue}
                                onChange={(next) =>
                                    emitChange([encodeDimensionValue(next)])
                                }
                            />
                        );
                        break;
                    }
                    default:
                        body = (
                            <ChipField
                                chips={displayOptions.map((o) => ({
                                    id: o.id,
                                    label: o.title,
                                }))}
                                valuesPerItem={field.valuesPerItem}
                                value={selected}
                                onChange={emitChange}
                            />
                        );
                }

                if (field.kind === 'pantone') {
                    return (
                        <div key={field.propertyKey} className="flex flex-col gap-4">
                            {body}
                        </div>
                    );
                }

                const titleValue =
                    field.kind === 'dimension'
                        ? summarizeDimensionValue(selectedId)
                        : selectedTitle;

                return (
                    <PropertyFieldPanel
                        key={field.propertyKey}
                        title={field.label}
                        {...(titleValue && titleValue !== '—'
                            ? {titleValue}
                            : {})}
                        variant={variant}
                    >
                        {body}
                    </PropertyFieldPanel>
                );
            })}
        </div>
    );
}

function defaultDimensionEncoded(): string {
    return encodeDimensionValue({unsure: false, values: {}});
}

export function initialPropertySelection(
    fields: PropertyFieldDescriptor[],
): PropertySelectionMap {
    const next: PropertySelectionMap = {};
    for (const field of fields) {
        if (field.kind === 'pantone') {
            Object.assign(next, defaultPantoneSelection());
            continue;
        }
        if (field.kind === 'dimension') {
            next[field.propertyKey] = [defaultDimensionEncoded()];
            continue;
        }
        if (field.kind === 'readonly') {
            const first = field.options[0]?.id;
            next[field.propertyKey] = first ? [first] : [];
            continue;
        }
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
        if (field.kind === 'pantone') {
            Object.assign(next, defaultPantoneSelection());
            continue;
        }
        if (field.kind === 'dimension') {
            next[field.propertyKey] = [
                encodeDimensionValue({unsure: true, values: {}}),
            ];
            continue;
        }
        if (field.kind === 'readonly') {
            const first = field.options[0]?.id;
            next[field.propertyKey] = first ? [first] : [];
            continue;
        }
        next[field.propertyKey] = [PROPERTY_CONSULTATION_ID];
    }
    return next;
}

export function isPropertyConsultationSelection(
    ids: string[] | undefined,
): boolean {
    return Boolean(ids?.includes(PROPERTY_CONSULTATION_ID));
}

export function fieldsNeedPantone(fields: PropertyFieldDescriptor[]): boolean {
    return fields.some((f) => f.kind === 'pantone');
}

/** Ordered summary items for rail / overview (consultation marked omitFromSummary). */
export function summariesForPropertySelection(
    fields: PropertyFieldDescriptor[],
    selection: PropertySelectionMap,
    consultationLabel = 'Need consultation',
): PropertySelectionSummaryItem[] {
    const items: PropertySelectionSummaryItem[] = [];
    for (const field of fields) {
        if (field.kind === 'pantone') continue;
        const ids = selection[field.propertyKey] ?? [];
        const displayKind = summaryKindForField(field.kind);
        if (field.kind === 'dimension') {
            const label = summarizeDimensionValue(ids[0]);
            if (label === 'Not sure') {
                items.push({
                    kind: 'chip',
                    label: consultationLabel,
                    omitFromSummary: true,
                });
            } else if (label !== '—') {
                items.push({
                    kind: 'chip',
                    label,
                    omitFromSummary: false,
                });
            }
            continue;
        }
        for (const id of ids) {
            if (id === PROPERTY_CONSULTATION_ID) {
                items.push({
                    kind: displayKind,
                    label: consultationLabel,
                    omitFromSummary: true,
                });
                continue;
            }
            const option = field.options.find((o) => o.id === id);
            if (!option) continue;
            items.push({
                kind: displayKind,
                label: option.title,
                omitFromSummary: false,
                ...(option.color ? {color: option.color} : {}),
                ...(option.imageUrl ? {imageUrl: option.imageUrl} : {}),
            });
        }
    }
    return items;
}
