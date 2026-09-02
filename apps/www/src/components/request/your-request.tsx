'use client';

import {useEffect, useMemo, useRef, useState} from 'react';
import Link from 'next/link';
import {Button} from '@pakfactory/ui/components/button';
import {PageDielineSection} from '@pakfactory/ui/components/page-dieline-section';
import {PageBreadcrumbSection} from '@/components/common/page-breadcrumb-section';
import {PageHeadingSection} from '@/components/common/page-heading-section';
import {RequestDraftList} from '@/components/request/request-draft-list';
import {RequestLineCard} from '@/components/request/request-line-card';
import {StartRequestButton} from '@/components/request/start-request-button';
import {REQUEST_COPY} from '@/lib/copy/request';
import {useRequest} from '@/lib/request/request-provider';
import {WWW_ROUTES} from '@/lib/www-routes';

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

    const selectedCount = useMemo(() => {
        let count = 0;
        for (const line of lines) {
            if (selected.has(line.id)) count += 1;
        }
        return count;
    }, [lines, selected]);

    const selectionSummary =
        selectedCount === 0
            ? REQUEST_COPY.selectedCountNone
            : selectedCount === 1
              ? REQUEST_COPY.selectedCountOne
              : REQUEST_COPY.selectedCountMany.replace(
                    '{n}',
                    String(selectedCount),
                );

    function setLineSelected(lineId: string, nextSelected: boolean) {
        setSelected((prev) => {
            const copy = new Set(prev);
            if (nextSelected) copy.add(lineId);
            else copy.delete(lineId);
            return copy;
        });
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
                        <div>
                            <ul className="space-y-4">
                                {lines.map((line) => (
                                    <RequestLineCard
                                        key={line.id}
                                        line={line}
                                        selected={selected.has(line.id)}
                                        onSelectedChange={(nextSelected) =>
                                            setLineSelected(line.id, nextSelected)
                                        }
                                        onRemove={removeLine}
                                        onUpdate={updateLine}
                                    />
                                ))}
                            </ul>
                            <div className="mt-4">
                                <Button asChild variant="outline" size="sm">
                                    <Link href={WWW_ROUTES.products}>
                                        {REQUEST_COPY.browseProducts}
                                    </Link>
                                </Button>
                            </div>
                            <RequestDraftList />
                        </div>

                        <aside className="lg:sticky lg:top-24 lg:self-start">
                            <div className="rounded-xl border border-border p-4">
                                <p className="text-sm font-medium">
                                    {selectionSummary}
                                </p>
                                {selectedCount === 0 ? (
                                    <p className="mt-2 text-sm text-muted-foreground">
                                        {REQUEST_COPY.emptySelectHint}
                                    </p>
                                ) : null}
                                <div className="mt-4">
                                    <StartRequestButton
                                        selectedCount={selectedCount}
                                    />
                                </div>
                            </div>
                        </aside>
                    </div>
                )}
            </PageDielineSection>
        </div>
    );
}
