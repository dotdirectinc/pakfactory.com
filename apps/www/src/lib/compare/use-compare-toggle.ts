'use client';

import type {MouseEvent} from 'react';

import {isInCompare, toggleCompare, useCompareSet, type AddInput} from '@/lib/compare/compare-set';

/**
 * One "Add to compare" control (R43): card icon, PDP / CDP button. Adds from anywhere — the
 * thumbnail flies from the button into the compare button and the dock opens on the group
 * (R45); clicking again removes it.
 */
export function useCompareToggle(input: AddInput | null) {
    useCompareSet(); // re-render when the set changes
    const inCompare = input ? isInCompare(input.kind, input.id) : false;
    const onClick = (event: MouseEvent<HTMLElement>) => {
        event.preventDefault();
        event.stopPropagation();
        if (!input) return;
        const r = (event.currentTarget as HTMLElement).getBoundingClientRect();
        toggleCompare(input, {x: r.left + r.width / 2, y: r.top + r.height / 2});
    };
    // Compare spec CMP-7: while added, the control's action is Remove (shown on hover/focus).
    return {inCompare, onClick, label: inCompare ? 'Added to compare' : 'Add to compare', actionLabel: inCompare ? 'Remove from compare' : 'Add to compare'};
}
