'use client';

import {useEffect, useRef, useState} from 'react';

const COLLAPSE_THRESHOLD = 2;

export type RequestLineAccordion = {
    /** When false, cards stay always expanded (no chevron). */
    collapsible: boolean;
    isExpanded: (lineId: string) => boolean;
    setExpanded: (lineId: string, open: boolean) => void;
};

/**
 * Accordion for request product lists.
 * Under {@link COLLAPSE_THRESHOLD} items: always expanded.
 * At/above: one open at a time; newly added lines auto-open.
 */
export function useRequestLineAccordion(lineIds: string[]): RequestLineAccordion {
    const collapsible = lineIds.length >= COLLAPSE_THRESHOLD;
    const [openId, setOpenId] = useState<string | null>(null);
    const prevIdsRef = useRef<string[]>(lineIds);

    useEffect(() => {
        const prev = prevIdsRef.current;
        const added = lineIds.filter((id) => !prev.includes(id));
        prevIdsRef.current = lineIds;

        if (added.length > 0) {
            setOpenId(added[added.length - 1] ?? null);
            return;
        }

        setOpenId((current) =>
            current !== null && !lineIds.includes(current) ? null : current,
        );
    }, [lineIds]);

    return {
        collapsible,
        isExpanded: (lineId: string) => {
            if (!collapsible) return true;
            return openId === lineId;
        },
        setExpanded: (lineId: string, open: boolean) => {
            if (!collapsible) return;
            setOpenId(open ? lineId : null);
        },
    };
}
