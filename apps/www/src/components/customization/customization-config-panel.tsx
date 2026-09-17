'use client';

import {useMemo, useState, type MouseEvent} from 'react';
import Link from 'next/link';
import {Bookmark, Download, Search} from 'lucide-react';
import {Button} from '@pakfactory/ui/components/button';
import {Input} from '@pakfactory/ui/components/input';
import {ChipField} from '@pakfactory/ui/components/customization/property-controller/chip-field';
import {SwatchField} from '@pakfactory/ui/components/customization/property-controller/swatch-field';
import {Icon} from '@/components/ui/icon';
import {stubBookmarkAction} from '@/lib/catalog-card-actions';
import {
    mapDetailToConfigFields,
    type ConfigFieldDescriptor,
} from '@/lib/catalog/map-detail-to-config-fields';
import type {CustomizationDetail} from '@/lib/catalog/types';
import {WWW_ROUTES} from '@/lib/www-routes';

type CustomizationConfigPanelProps = {
    detail: CustomizationDetail;
};

type SelectionMap = Record<string, string[]>;

function initialSelection(fields: ConfigFieldDescriptor[]): SelectionMap {
    const next: SelectionMap = {};
    for (const field of fields) {
        const first = field.options[0]?.id;
        next[field.propertyKey] = first ? [first] : [];
    }
    return next;
}

function titlesForIds(field: ConfigFieldDescriptor, ids: string[]): string[] {
    const byId = new Map(field.options.map((o) => [o.id, o.title]));
    return ids
        .map((id) => byId.get(id))
        .filter((t): t is string => Boolean(t));
}

function fieldMatchesQuery(
    field: ConfigFieldDescriptor,
    query: string,
): boolean {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    if (field.label.toLowerCase().includes(q)) return true;
    return field.options.some((o) => o.title.toLowerCase().includes(q));
}

/**
 * Right-rail configurator for customization Option detail (PROD-1299 Slice C).
 * Chrome matches Configuration mock; shared ui property controllers unchanged.
 */
export function CustomizationConfigPanel({
    detail,
}: CustomizationConfigPanelProps) {
    const fields = useMemo(() => mapDetailToConfigFields(detail), [detail]);
    const [selection, setSelection] = useState<SelectionMap>(() =>
        initialSelection(fields),
    );
    const [query, setQuery] = useState('');

    const visibleFields = useMemo(
        () => fields.filter((field) => fieldMatchesQuery(field, query)),
        [fields, query],
    );

    const selectionSummary = useMemo(() => {
        const parts: string[] = [];
        for (const field of fields) {
            const ids = selection[field.propertyKey] ?? [];
            parts.push(...titlesForIds(field, ids));
        }
        return parts.join(' · ');
    }, [fields, selection]);

    const customizeHref = `${WWW_ROUTES.products}?customize=${encodeURIComponent(detail.categoryValue)}/${encodeURIComponent(detail.slug)}`;

    const setPropertyValue = (propertyKey: string, ids: string[]) => {
        setSelection((prev) => ({...prev, [propertyKey]: ids}));
    };

    const onBookmark = (event: MouseEvent<HTMLButtonElement>) => {
        stubBookmarkAction(event);
    };

    const onDownloadSpec = (event: MouseEvent<HTMLButtonElement>) => {
        event.preventDefault();
    };

    return (
        <div className="mt-8 flex flex-col gap-6">
            <div className="flex flex-col gap-4 border-t border-dashed border-border pt-4">
                <h2 className="text-base font-semibold text-foreground">
                    Configuration
                </h2>

                <div className="relative min-w-0">
                    <Icon
                        icon={Search}
                        size="sm"
                        className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground"
                    />
                    <Input
                        type="search"
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="Search a specific option."
                        aria-label="Search a specific option"
                        className="rounded-md py-2 pl-9"
                    />
                </div>

                {fields.length > 0 ? (
                    <div className="flex flex-col gap-4">
                        {visibleFields.map((field) => {
                            const selected = selection[field.propertyKey] ?? [];
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
                                                swatches={field.options.map(
                                                    (o) => ({
                                                        id: o.id,
                                                        label: o.title,
                                                        ...(o.imageUrl
                                                            ? {
                                                                  imageUrl:
                                                                      o.imageUrl,
                                                              }
                                                            : {}),
                                                    }),
                                                )}
                                                value={selected[0]}
                                                onChange={(id) =>
                                                    setPropertyValue(
                                                        field.propertyKey,
                                                        [id],
                                                    )
                                                }
                                            />
                                        ) : (
                                            <ChipField
                                                chips={field.options.map(
                                                    (o) => ({
                                                        id: o.id,
                                                        label: o.title,
                                                    }),
                                                )}
                                                valuesPerItem={
                                                    field.valuesPerItem
                                                }
                                                value={selected}
                                                onChange={(ids) =>
                                                    setPropertyValue(
                                                        field.propertyKey,
                                                        ids,
                                                    )
                                                }
                                            />
                                        )}
                                    </div>
                                </section>
                            );
                        })}
                        {visibleFields.length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                                No options match your search.
                            </p>
                        ) : null}
                    </div>
                ) : null}
            </div>

            {fields.length > 0 ? (
                <div className="flex flex-col gap-2 border-t border-dashed border-border pt-4">
                    <p className="text-base font-semibold text-foreground">
                        Your selection
                    </p>
                    <dl className="flex flex-col gap-1">
                        <div className="flex items-baseline justify-between gap-4 text-sm">
                            <dt className="shrink-0 text-muted-foreground">
                                Material
                            </dt>
                            <dd className="min-w-0 text-right font-semibold text-foreground">
                                {detail.title}
                            </dd>
                        </div>
                        <div className="flex items-baseline justify-between gap-4 text-sm">
                            <dt className="shrink-0 text-muted-foreground">
                                Selection
                            </dt>
                            <dd className="min-w-0 text-right font-semibold text-foreground">
                                {selectionSummary || '—'}
                            </dd>
                        </div>
                    </dl>
                </div>
            ) : null}

            <div className="flex flex-col gap-2">
                <Button asChild className="h-auto w-full px-6 py-3 text-base">
                    <Link href={customizeHref}>
                        Choose a packaging item to customize
                    </Link>
                </Button>
                <Button
                    type="button"
                    variant="outline"
                    className="h-auto w-full px-6 py-3 text-base shadow-none"
                    onClick={onBookmark}
                >
                    <Icon icon={Bookmark} size="sm" />
                    Bookmark
                </Button>
                <div className="flex justify-end">
                    <Button
                        type="button"
                        variant="link"
                        size="sm"
                        className="h-auto gap-1 px-0 text-muted-foreground"
                        onClick={onDownloadSpec}
                    >
                        <Icon icon={Download} size="sm" />
                        Download spec sheet
                    </Button>
                </div>
            </div>
        </div>
    );
}
