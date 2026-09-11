'use client';

import {useEffect, useMemo, useState} from 'react';
import {X} from 'lucide-react';
import {Button} from '@pakfactory/ui/components/button';
import {PageDielineSection} from '@pakfactory/ui/components/page-dieline-section';
import {Skeleton} from '@pakfactory/ui/components/skeleton';
import {PageBreadcrumbSection} from '@/components/common/page-breadcrumb-section';
import {PageHeadingSection} from '@/components/common/page-heading-section';
import {RequestAddProducts} from '@/components/request/request-add-products';
import {RequestDraftList} from '@/components/request/request-draft-list';
import {ProductRequestCard} from '@/components/request/product-request-card';
import {StartRequestButton} from '@/components/request/start-request-button';
import {REQUEST_COPY} from '@/lib/copy/request';
import {useRequest} from '@/lib/request/request-provider';
import type {RequestLine} from '@/lib/request/request.storage';
import {WWW_ROUTES} from '@/lib/www-routes';

type SelectedPoolRailLineProps = {
    line: RequestLine;
    onDeselect: (lineId: string) => void;
};

function SelectedPoolRailLine({line, onDeselect}: SelectedPoolRailLineProps) {
    const title = line.productTitle ?? line.productSlug;
    const thumb = line.productMedia?.[0];
    const qtySummary = line.quantities
        .map((n) => n.toLocaleString('en-US'))
        .join(', ');

    return (
        <div className="flex items-center gap-3 py-2">
            <span className="size-11 shrink-0 overflow-hidden rounded-md border border-border bg-muted">
                {thumb?.src ? (
                    // Catalog media URLs are static fixture assets.
                    <img
                        src={thumb.src}
                        alt=""
                        className="size-full object-cover"
                    />
                ) : (
                    <span className="flex size-full items-center justify-center text-xs text-muted-foreground">
                        —
                    </span>
                )}
            </span>
            <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{title}</p>
                {qtySummary ? (
                    <p className="text-xs text-muted-foreground">
                        {qtySummary} {REQUEST_COPY.unitsSuffix}
                    </p>
                ) : null}
            </div>
            <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="size-7 shrink-0 text-muted-foreground"
                aria-label={`Deselect ${title}`}
                onClick={() => onDeselect(line.id)}
            >
                <X className="size-4" aria-hidden />
            </Button>
        </div>
    );
}

export function YourRequest() {
    const {lines, draft, removeLine, updateLine} = useRequest();
    // Selected = every current line unless explicitly deselected (default-on).
    const [deselectedIds, setDeselectedIds] = useState<Set<string>>(
        () => new Set(),
    );
    // Server snapshot is always empty; wait for localStorage before choosing
    // empty vs filled so the Add products fork does not flash on refresh.
    const [hydrated, setHydrated] = useState(false);

    useEffect(() => {
        setHydrated(true);
    }, []);

    const lineIds = useMemo(() => lines.map((line) => line.id), [lines]);

    useEffect(() => {
        setDeselectedIds((prev) => {
            const known = new Set(lineIds);
            let changed = false;
            const next = new Set<string>();
            for (const id of prev) {
                if (known.has(id)) next.add(id);
                else changed = true;
            }
            return changed ? next : prev;
        });
    }, [lineIds]);

    const selected = useMemo(
        () => new Set(lineIds.filter((id) => !deselectedIds.has(id))),
        [lineIds, deselectedIds],
    );

    const selectedLines = useMemo(
        () => lines.filter((line) => selected.has(line.id)),
        [lines, selected],
    );
    const selectedCount = selectedLines.length;
    const allSelected =
        lines.length > 0 && selectedCount === lines.length;

    function setLineSelected(lineId: string, nextSelected: boolean) {
        setDeselectedIds((prev) => {
            const copy = new Set(prev);
            if (nextSelected) copy.delete(lineId);
            else copy.add(lineId);
            return copy;
        });
    }

    function toggleSelectAll() {
        if (allSelected) {
            setDeselectedIds(new Set(lineIds));
            return;
        }
        setDeselectedIds(new Set());
    }

    return (
        <div className="min-h-screen bg-background">
            <PageBreadcrumbSection
                items={[
                    {label: 'Home', href: WWW_ROUTES.home},
                    {label: REQUEST_COPY.yourRequestHeading},
                ]}
            />
            <PageHeadingSection
                title={REQUEST_COPY.yourRequestHeading}
                description={REQUEST_COPY.yourRequestSupporting}
                innerClassName="border-b border-dashed border-border"
            />

            <PageDielineSection innerClassName="pb-24 pt-8">
                {!hydrated ? (
                    <div
                        className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_20rem]"
                        aria-hidden
                    >
                        <div className="min-w-0">
                            <div className="mb-3 flex items-center justify-between gap-3">
                                <Skeleton className="h-7 w-28" />
                                <Skeleton className="h-4 w-20" />
                            </div>
                            <div className="flex overflow-hidden rounded-xl border border-border">
                                <Skeleton className="size-[115px] shrink-0 rounded-none" />
                                <div className="flex min-w-0 flex-1 flex-col gap-2 p-4">
                                    <Skeleton className="h-5 w-3/4 max-w-md" />
                                    <Skeleton className="h-4 w-40" />
                                    <Skeleton className="mt-2 h-4 w-52" />
                                </div>
                            </div>
                            <Skeleton className="mt-4 h-4 w-36" />
                        </div>
                        <aside className="hidden h-fit lg:block lg:sticky lg:top-24 lg:self-start">
                            <div className="rounded-xl border border-border p-5">
                                <Skeleton className="h-5 w-40" />
                                <Skeleton className="mt-2 h-3 w-full" />
                                <Skeleton className="mt-4 h-[120px] w-full rounded-lg" />
                                <Skeleton className="mt-4 h-10 w-full" />
                            </div>
                        </aside>
                    </div>
                ) : lines.length === 0 ? (
                    <div>
                        <div className="rounded-xl border border-dashed border-border px-4 py-8">
                            <p className="mb-4 text-sm text-muted-foreground">
                                {REQUEST_COPY.nothingAddedYet}
                            </p>
                            <RequestAddProducts variant="empty" />
                        </div>
                        <RequestDraftList />
                    </div>
                ) : (
                    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_20rem]">
                        <div className="min-w-0">
                            <div className="mb-3 flex items-center justify-between gap-3">
                                <h3 className="text-lg font-semibold tracking-tight">
                                    {REQUEST_COPY.itemsHeading.replace(
                                        '{n}',
                                        String(lines.length),
                                    )}
                                </h3>
                                <Button
                                    type="button"
                                    variant="link"
                                    className="h-auto shrink-0 p-0 text-[13px] font-medium text-muted-foreground"
                                    onClick={toggleSelectAll}
                                >
                                    {allSelected
                                        ? REQUEST_COPY.deselectAll
                                        : REQUEST_COPY.selectAll}
                                </Button>
                            </div>

                            <ul className="space-y-3">
                                {lines.map((line) => (
                                    <ProductRequestCard
                                        key={line.id}
                                        line={line}
                                        draftId={draft.id}
                                        selectable
                                        selected={selected.has(line.id)}
                                        onSelectedChange={(nextSelected) =>
                                            setLineSelected(
                                                line.id,
                                                nextSelected,
                                            )
                                        }
                                        onRemove={removeLine}
                                        onUpdate={updateLine}
                                    />
                                ))}
                            </ul>

                            <RequestAddProducts
                                variant="more"
                                className="mt-4"
                            />

                            <RequestDraftList />
                        </div>

                        <aside className="h-fit lg:sticky lg:top-24 lg:self-start">
                            <div className="rounded-xl border border-border p-5">
                                <h3 className="text-base font-semibold tracking-tight">
                                    {REQUEST_COPY.selectedProductsHeading}
                                </h3>
                                <p className="mt-0.5 text-[12.5px] text-muted-foreground">
                                    {REQUEST_COPY.selectedProductsSupporting}
                                </p>

                                {selectedCount === 0 ? (
                                    <div className="mt-4 flex min-h-[120px] items-center justify-center rounded-lg border border-dashed border-border px-4 py-6 text-center text-[13px] text-muted-foreground">
                                        {REQUEST_COPY.emptySelectHint}
                                    </div>
                                ) : (
                                    <div className="mt-4 space-y-0.5">
                                        {selectedLines.map((line) => (
                                            <SelectedPoolRailLine
                                                key={line.id}
                                                line={line}
                                                onDeselect={(lineId) =>
                                                    setLineSelected(
                                                        lineId,
                                                        false,
                                                    )
                                                }
                                            />
                                        ))}
                                    </div>
                                )}

                                <div className="mt-4">
                                    <StartRequestButton
                                        selectedIds={[...selected]}
                                    />
                                </div>
                                <p className="mt-3 text-center text-[12.5px] text-muted-foreground">
                                    {REQUEST_COPY.prepareQuoteFootnote}
                                </p>
                            </div>
                        </aside>
                    </div>
                )}
            </PageDielineSection>
        </div>
    );
}
