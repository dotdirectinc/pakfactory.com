import {useEffect, useRef, type RefObject} from 'react';
import type {WizardRailRowData} from '@/components/request/wizard-rail-row';

/** Sticky header offset for rail scroll-to-section + scroll-spy. */
export const REQUEST_WIZARD_SECTION_TOP_OFFSET = 108;

/**
 * Account detail scrolls inside the shell `main`, which has no sticky header.
 * Keep the section title a short step below the panel top.
 */
export const REQUEST_PANEL_SECTION_TOP_OFFSET = 24;

type SectionRefMap = Record<
    string,
    RefObject<HTMLElement | null> | undefined
>;

type RequestWizardScrollOptions = {
    /** Distance from the scrollport top to the section heading. */
    offset?: number;
    /**
     * `window` — Brief Builder. `nearest` — scroll the closest overflow
     * ancestor (account shell `main`).
     */
    root?: 'window' | 'nearest';
};

function scrollOffset(options?: RequestWizardScrollOptions): number {
    return options?.offset ?? REQUEST_WIZARD_SECTION_TOP_OFFSET;
}

/** Closest ancestor whose overflow scrolls (the account shell `main`). */
function scrollParent(el: HTMLElement): HTMLElement | null {
    let node = el.parentElement;
    while (node) {
        const {overflowY} = getComputedStyle(node);
        if (overflowY === 'auto' || overflowY === 'scroll') return node;
        node = node.parentElement;
    }
    return null;
}

function scrollSectionIntoView(
    el: HTMLElement,
    offset: number,
    rootMode: 'window' | 'nearest',
): void {
    const root = rootMode === 'nearest' ? scrollParent(el) : null;
    if (!root) {
        const top =
            el.getBoundingClientRect().top + window.scrollY - offset;
        window.scrollTo({top: Math.max(0, top), behavior: 'smooth'});
        return;
    }
    const top =
        el.getBoundingClientRect().top -
        root.getBoundingClientRect().top +
        root.scrollTop -
        offset;
    root.scrollTo({top: Math.max(0, top), behavior: 'smooth'});
}

export function scrollToRequestWizardSection(
    sectionRefs: SectionRefMap,
    key: string,
    onActive: (key: string) => void,
    options?: RequestWizardScrollOptions,
): void {
    const el = sectionRefs[key]?.current;
    if (!el) return;
    scrollSectionIntoView(el, scrollOffset(options), options?.root ?? 'window');
    onActive(key);
}

/**
 * Updates active rail key as the buyer scrolls.
 */
export function useRequestWizardScrollSpy(
    railRows: WizardRailRowData[],
    sectionRefs: SectionRefMap,
    onActive: (key: string) => void,
    options?: RequestWizardScrollOptions,
): void {
    const onActiveRef = useRef(onActive);
    onActiveRef.current = onActive;
    const sectionRefsRef = useRef(sectionRefs);
    sectionRefsRef.current = sectionRefs;
    const offset = scrollOffset(options);
    const rootMode = options?.root ?? 'window';

    useEffect(() => {
        const refs = sectionRefsRef.current;
        const anchor = railRows
            .map((row) => refs[row.key]?.current)
            .find((el): el is HTMLElement => el != null);
        const root =
            rootMode === 'nearest' && anchor ? scrollParent(anchor) : null;
        const target: HTMLElement | Window = root ?? window;

        function onScroll() {
            const line = root
                ? root.getBoundingClientRect().top + offset
                : offset;
            const currentRefs = sectionRefsRef.current;
            let current = railRows[0]?.key ?? 'requirements';
            for (const row of railRows) {
                const el = currentRefs[row.key]?.current;
                if (!el) continue;
                if (el.getBoundingClientRect().top <= line + 8) {
                    current = row.key;
                }
            }
            onActiveRef.current(current);
        }
        target.addEventListener('scroll', onScroll, {passive: true});
        onScroll();
        return () => target.removeEventListener('scroll', onScroll);
    }, [railRows, offset, rootMode]);
}
