import type {RequestDraft, RequestLine} from '@/lib/request/request.storage';
import {hasShippingLocation} from '@/lib/request/shipping-address';

export function isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function expressQuantityDigits(value: string): string {
    return String(value ?? '').replace(/[^0-9]/g, '');
}

export function isExpressQuantityReady(
    draft: RequestDraft,
    lines: RequestLine[],
): boolean {
    if (!draft.express || lines.length > 0) return true;
    const digits = expressQuantityDigits(draft.expressQuantity);
    const n = Number(digits);
    return digits.length > 0 && n > 0 && n % 100 === 0;
}

export function isContentsReady(
    draft: RequestDraft,
    lines: RequestLine[],
): boolean {
    if (!draft.express) return true;
    if (lines.length > 0) {
        return lines.every((line) => line.contents.trim().length > 0);
    }
    return draft.packagingContents.trim().length > 0;
}

export function isNotesReady(draft: RequestDraft): boolean {
    return draft.notes.trim().length > 0;
}

export function isShippingReady(draft: RequestDraft): boolean {
    return hasShippingLocation(draft.shippingAddress);
}

export function isContactReady(draft: RequestDraft): boolean {
    return (
        draft.contactFirstName.trim().length > 0 &&
        draft.contactLastName.trim().length > 0 &&
        isValidEmail(draft.contactEmail)
    );
}

export function isItemsReady(draft: RequestDraft, lines: RequestLine[]): boolean {
    // Express cold + services entry (products upsell off) do not require lines.
    if (!draft.productsExpanded) {
        if (draft.express || draft.entryKind === 'services') return true;
    }
    if (lines.length === 0) return false;
    return lines.every((line) => line.quantities.some((n) => n > 0));
}

export function canSubmitRequest(
    draft: RequestDraft,
    lines: RequestLine[],
): boolean {
    return (
        isItemsReady(draft, lines) &&
        isNotesReady(draft) &&
        isShippingReady(draft) &&
        isContactReady(draft) &&
        isContentsReady(draft, lines) &&
        isExpressQuantityReady(draft, lines)
    );
}

export function isExpressCold(
    draft: RequestDraft,
    lines: RequestLine[],
): boolean {
    return draft.express && !draft.productsExpanded && lines.length === 0;
}

export function showFullRail(draft: RequestDraft, lines: RequestLine[]): boolean {
    if (draft.entryKind === 'services') {
        return draft.servicesEnabled || draft.productsExpanded || lines.length > 0;
    }
    return draft.productsExpanded || lines.length > 0 || !draft.express;
}

export function showProductsSection(draft: RequestDraft, lines: RequestLine[]): boolean {
    if (draft.entryKind === 'express' && !draft.productsExpanded && lines.length === 0) {
        return false;
    }
    if (draft.entryKind === 'services') {
        return draft.productsExpanded || lines.length > 0;
    }
    return true;
}

export function showServicesSection(draft: RequestDraft, lines: RequestLine[]): boolean {
    if (draft.entryKind === 'express' && !draft.productsExpanded && lines.length === 0) {
        return false;
    }
    if (draft.entryKind === 'services') return true;
    // Products entry: services always present as upsell toggle.
    return draft.entryKind === 'products' || showFullRail(draft, lines);
}
