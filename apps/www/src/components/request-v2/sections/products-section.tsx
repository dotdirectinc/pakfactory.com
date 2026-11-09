'use client';

import {useEffect} from 'react';
import {ProductRequestCard} from '@/components/request/product-request-card';
import {useRequest} from '@/lib/request/request-provider';

/**
 * RFQ v2 Items section: the items in the request, each with a tick (decision 6: the
 * selection is live — what's ticked is the request), edit and remove. PORTABLE.
 */
export function ProductsSection() {
    const {lines, draft, updateDraft, removeLine, updateLine} = useRequest();
    // Selection is stored as what's unticked, so items added later join ticked.
    const excluded = new Set(draft.excludedLineIds ?? []);
    const selected = new Set(lines.map((l) => l.id).filter((id) => !excluded.has(id)));
    const selectedIds = lines.map((l) => l.id).filter((id) => selected.has(id));
    const key = selectedIds.join(',');
    // Keep the request's items (builderLineIds, what's submitted) in step with the ticks.
    useEffect(() => {
        if ((draft.builderLineIds ?? []).join(',') !== key) updateDraft({builderLineIds: selectedIds});
    }, [key]);
    const setSelected = (id: string, on: boolean) => {
        const next = new Set(excluded);
        if (on) next.delete(id);
        else next.add(id);
        updateDraft({excludedLineIds: [...next], builderLineIds: lines.map((l) => l.id).filter((x) => !next.has(x))});
    };
    return (
        <div className="flex flex-col gap-8">
            <ul className="flex list-none flex-col gap-8 p-0">
                {lines.map((line) => (
                    <ProductRequestCard
                        key={line.id}
                        line={line}
                        draftId={draft.id}
                        selectable
                        selected={selected.has(line.id)}
                        onSelectedChange={(on) => setSelected(line.id, on)}
                        onRemove={(id) => removeLine(id)}
                        onUpdate={updateLine}
                    />
                ))}
            </ul>
        </div>
    );
}
