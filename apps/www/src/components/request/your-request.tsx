'use client';

import {useEffect, useMemo, useRef, useState} from 'react';
import Link from 'next/link';
import {Plus, X} from 'lucide-react';
import {Button} from '@pakfactory/ui/components/button';
import {PageDielineSection} from '@pakfactory/ui/components/page-dieline-section';
import {PageBreadcrumbSection} from '@/components/common/page-breadcrumb-section';
import {PageHeadingSection} from '@/components/common/page-heading-section';
import {RequestDraftList} from '@/components/request/request-draft-list';
import {RequestLineCard} from '@/components/request/request-line-card';
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
    const {lines, removeLine, updateLine} = useRequest();
    const [selected, setSelected] = useState<Set<string>>(() => new Set());
    const seenIdsRef = useRef<Set<string>>(new Set());

    const lineIds = useMemo(() => lines.map((line) => line.id), [lines]);

    useEffect(() => {
        setSelected((prev) => {
            const known = new Set(lineIds);
            const next = new Set(
                [...prev].filter((id) => known.has(id)),
            );
            for (const id of lineIds) {
                if (!seenIdsRef.current.has(id)) {
                    next.add(id);
                }
            }
            seenIdsRef.current = known;
            return next;
        });
    }, [lineIds]);

    const selectedLines = useMemo(
        () => lines.filter((line) => selected.has(line.id)),
        [lines, selected],
    );
    const selectedCount = selectedLines.length;
    const allSelected =
        lines.length > 0 && selectedCount === lines.length;

    function setLineSelected(lineId: string, nextSelected: boolean) {
        setSelected((prev) => {
            const copy = new Set(prev);
            if (nextSelected) copy.add(lineId);
            else copy.delete(lineId);
            return copy;
        });
    }

    function toggleSelectAll() {
        if (allSelected) {
            setSelected(new Set());
            return;
        }
        setSelected(new Set(lineIds));
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
                {lines.length === 0 ? (
                    <div>
                        <div className="rounded-xl border border-dashed border-border p-8">
                            <p className="text-sm text-muted-foreground">
                                {REQUEST_COPY.nothingAddedYet}
                            </p>
                            <Button asChild className="mt-4">
                                <Link href={WWW_ROUTES.products}>
                                    {REQUEST_COPY.browseProducts}
                                </Link>
                            </Button>
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

                            <ul>
                                {lines.map((line, index) => (
                                    <RequestLineCard
                                        key={line.id}
                                        line={line}
                                        selected={selected.has(line.id)}
                                        isLast={index === lines.length - 1}
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

                            <Link
                                href={WWW_ROUTES.products}
                                className="group mt-4 flex items-center gap-3.5 rounded-md border border-dashed border-border p-3.5 transition-colors hover:border-foreground/50 hover:bg-muted/40"
                            >
                                <span className="flex size-16 shrink-0 items-center justify-center rounded-md border border-dashed border-border bg-muted/30 text-muted-foreground transition-colors group-hover:border-foreground/50 group-hover:bg-muted group-hover:text-foreground">
                                    <Plus className="size-6" aria-hidden />
                                </span>
                                <span className="text-sm font-medium text-muted-foreground transition-colors group-hover:text-foreground">
                                    {REQUEST_COPY.addMoreProducts}
                                </span>
                            </Link>

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
