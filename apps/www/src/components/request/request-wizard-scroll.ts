import {useEffect, useRef, type RefObject} from 'react';
import type {WizardRailRowData} from '@/components/request/wizard-rail-row';

/** Sticky header offset for rail scroll-to-section + scroll-spy. */
export const REQUEST_WIZARD_SECTION_TOP_OFFSET = 108;

type SectionRefMap = Record<
    string,
    RefObject<HTMLElement | null> | undefined
>;

export function scrollToRequestWizardSection(
    sectionRefs: SectionRefMap,
    key: string,
    onActive: (key: string) => void,
): void {
    const el = sectionRefs[key]?.current;
    if (!el) return;
    const top =
        el.getBoundingClientRect().top +
        window.scrollY -
        REQUEST_WIZARD_SECTION_TOP_OFFSET;
    window.scrollTo({top: Math.max(0, top), behavior: 'smooth'});
    onActive(key);
}

/**
 * Updates active rail key as the buyer scrolls.
 */
export function useRequestWizardScrollSpy(
    railRows: WizardRailRowData[],
    sectionRefs: SectionRefMap,
    onActive: (key: string) => void,
): void {
    const onActiveRef = useRef(onActive);
    onActiveRef.current = onActive;
    const sectionRefsRef = useRef(sectionRefs);
    sectionRefsRef.current = sectionRefs;

    useEffect(() => {
        function onScroll() {
            const line = REQUEST_WIZARD_SECTION_TOP_OFFSET;
            const refs = sectionRefsRef.current;
            let current = railRows[0]?.key ?? 'requirements';
            for (const row of railRows) {
                const el = refs[row.key]?.current;
                if (!el) continue;
                if (el.getBoundingClientRect().top <= line + 8) {
                    current = row.key;
                }
            }
            onActiveRef.current(current);
        }
        window.addEventListener('scroll', onScroll, {passive: true});
        onScroll();
        return () => window.removeEventListener('scroll', onScroll);
    }, [railRows]);
}
