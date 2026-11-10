/**
 * Sectioned request URLs: the kind is in the path, the open step in `?step=`, and
 * no lead id. `/request/products` (the clipboard icon: items) · `/request/general` (Get a Quote) ·
 * `/request/services` later. PORTABLE.
 */
import {WWW_ROUTES} from '@/lib/www-routes';
import {isSectionKey, REQUEST_SECTIONS, type SectionKey} from '@/lib/request-sections/flow';
import type {RequestFlow} from '@/lib/intake/routes';

export type RequestKind = 'product' | 'general';

export const KIND_PATH: Record<RequestKind, string> = {
    product: WWW_ROUTES.requestProducts,
    general: WWW_ROUTES.requestExpress,
};

/** The step names buyers see in the URL (Items section = `items`). */
const STEP_PARAM: Record<SectionKey, string> = {products: 'items', details: 'details', contact: 'contact'};

export function requestHref(kind: RequestKind, step?: SectionKey | 'submit'): string {
    const base = KIND_PATH[kind];
    if (!step) return base;
    return `${base}?step=${step === 'submit' ? 'submit' : STEP_PARAM[step]}`;
}

/** `?step=` → section (accepts the old `products`). */
export function stepFromParam(v: string | null | undefined): SectionKey | 'submit' | null {
    if (v === 'items' || v === 'products') return 'products';
    if (v === 'submit') return 'submit';
    return isSectionKey(v) ? v : null;
}

export function submittedHref(kind: RequestKind, ref: string): string {
    return `${KIND_PATH[kind]}/submitted?ref=${encodeURIComponent(ref)}`;
}

export function kindOfFlow(flow: RequestFlow): RequestKind | null {
    return flow === 'product' ? 'product' : flow === 'general' ? 'general' : null;
}

/** An old step URL (`/request/{flow}/{leadId}/{screen}`) → the section it now lives in. */
export function sectionForOldScreen(flow: RequestFlow, screen: string | null | undefined): SectionKey | null {
    if (!screen) return null;
    const sections = REQUEST_SECTIONS[flow];
    if (isSectionKey(screen) && sections.includes(screen)) return screen;
    if (screen === 'type' || screen === 'services') return sections.includes('details') ? 'details' : null;
    if (screen === 'review') return sections[sections.length - 1] ?? null;
    return null;
}
