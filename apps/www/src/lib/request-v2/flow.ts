/**
 * RFQ v2 (vault prd-website-rfq-v2.md): which sections each request has, in order.
 * Data, not screens — a new request type (e.g. service, later) is one entry here.
 * PORTABLE: no POC imports.
 */
import type {RequestFlow} from '@/lib/intake/routes';

export type SectionKey = 'products' | 'details' | 'contact';

export const SECTION_TITLE: Record<SectionKey, string> = {
    products: 'Items',
    details: 'Project details',
    contact: 'Contact details',
};

export const REQUEST_SECTIONS: Record<RequestFlow, SectionKey[]> = {
    product: ['products', 'details', 'contact'],
    general: ['details', 'contact'],
    // Not for launch; until the Service detail page is planned it keeps today's intake.
    service: ['details', 'contact'],
};

export function isSectionKey(v: string | null | undefined): v is SectionKey {
    return v === 'products' || v === 'details' || v === 'contact';
}
