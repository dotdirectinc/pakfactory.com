/**
 * Sectioned request: which sections each request has, in order.
 * Data, not screens — a new request type (e.g. service, later) is one entry here.
 * PORTABLE: no POC imports.
 */
import type {RequestFlow} from '@/lib/intake/routes';

export type SectionKey = 'products' | 'details' | 'contact' | 'submit';

export const SECTION_TITLE: Record<SectionKey, string> = {
    products: 'Items',
    details: 'Project summary',
    contact: 'Contact Information',
    submit: 'Submit',
};

/** Content steps only — Submit lives inside open Contact, not as its own section. */
export const REQUEST_SECTIONS: Record<RequestFlow, SectionKey[]> = {
    product: ['products', 'details', 'contact'],
    general: ['details', 'contact'],
    // Not for launch; until the Service detail page is planned it keeps today's intake.
    service: ['details', 'contact'],
};

export function isSectionKey(v: string | null | undefined): v is SectionKey {
    return v === 'products' || v === 'details' || v === 'contact' || v === 'submit';
}
