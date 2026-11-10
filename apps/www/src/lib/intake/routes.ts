import {WWW_ROUTES} from '@/lib/www-routes';

/**
 * Request URLs (Website PRD R40): everything that can become a lead lives at
 * /request/{flow}/{leadId}/{screen}. The entry page gives the request a lead id and forwards.
 * Screen slugs are words, never numbers, and never renamed. Every intake shell uses
 * the same URLs; the shell is an analytics field.
 */
export const REQUEST_FLOWS = ['general', 'product', 'service'] as const;
export type RequestFlow = (typeof REQUEST_FLOWS)[number];

export function isRequestFlow(v: string | null | undefined): v is RequestFlow {
    return (REQUEST_FLOWS as readonly string[]).includes(v ?? '');
}

/** Every screen slug any flow uses (each flow's own list is in lib/intake/flows). */
export const INTAKE_SCREEN_KEYS = ['type', 'products', 'services', 'details', 'contact', 'review'] as const;
export type IntakeScreenKey = (typeof INTAKE_SCREEN_KEYS)[number];
/** @deprecated use IntakeScreenKey */
export type GeneralScreenKey = IntakeScreenKey;

/** The confirmation after submit: /request/{flow}/{leadId}/thank-you. */
export const SUBMITTED_SCREEN = 'thank-you';

export function isIntakeScreenKey(v: string | null | undefined): v is IntakeScreenKey {
    return (INTAKE_SCREEN_KEYS as readonly string[]).includes(v ?? '');
}

/** Lead ids are random (UUID), never a counter (R40 safety). */
const LEAD_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function isLeadId(v: string | null | undefined): v is string {
    return LEAD_ID_PATTERN.test(v ?? '');
}

/** Entry pages (unchanged so every existing button keeps working). */
const ENTRY_HREF: Record<RequestFlow, string> = {
    general: WWW_ROUTES.requestExpress,
    product: WWW_ROUTES.requestProducts,
    service: WWW_ROUTES.requestServices,
};

export function requestEntryHref(flow: RequestFlow): string {
    return ENTRY_HREF[flow];
}

/** /request/{flow}/{leadId} (the intake picks the screen) or /request/{flow}/{leadId}/{screen}. */
export function requestScreenHref(flow: RequestFlow, leadId: string, screen?: string): string {
    const base = `${WWW_ROUTES.request}/${flow}/${leadId}`;
    return screen ? `${base}/${screen}` : base;
}

export function parseRequestSlug(slug: string[] | undefined): {leadId: string | null; screen: string | null} {
    const [leadId = null, screen = null] = slug ?? [];
    return {leadId, screen};
}
