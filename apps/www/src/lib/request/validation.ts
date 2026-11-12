import {hasNeed, NEED_PACKAGING, NEED_SERVICE} from '@/lib/intake/needs';
import {OTHER_SERVICE_ID} from '@/lib/request/service-label';
import type {RequestDraft, RequestLine} from '@/lib/request/request.storage';
import {hasShippingLocation} from '@/lib/request/shipping-address';

import {isAddressFieldsValid} from '@/lib/request/schemas/address';
import {
    contactEmailSchema,
    isContactIntakeValid,
    isValidWebsiteHost,
} from '@/lib/request/schemas/contact';

export function isValidEmail(email: string): boolean {
    return contactEmailSchema.safeParse(email).success;
}

/**
 * Express quotes requirements only until the buyer expands products, so
 * `productsExpanded` — not the pool contents — decides which fields apply.
 */
export function isExpressRequirementsOnly(draft: RequestDraft): boolean {
    return draft.express && !draft.productsExpanded;
}

/** R36: does this quote request ask for packaging / a service? (Non-express: packaging as today.) */
export function needsPackaging(draft: RequestDraft): boolean {
    return !draft.express || hasNeed(draft, NEED_PACKAGING);
}
export function needsService(draft: RequestDraft): boolean {
    return draft.express && hasNeed(draft, NEED_SERVICE);
}
export function isServicesReady(draft: RequestDraft): boolean {
    if (!needsService(draft)) return true;
    if (draft.services.length === 0) return false;
    // "Something else" needs the buyer's words (step intake, Nov 2).
    return !draft.services.includes(OTHER_SERVICE_ID) || Boolean(draft.serviceOther?.trim());
}

export function isExpressQuantityReady(
    draft: RequestDraft,
    _lines: RequestLine[],
): boolean {
    if (!isExpressRequirementsOnly(draft)) return true;
    if (!needsPackaging(draft)) return true;
    const quantities = draft.expressQuantities ?? [];
    if (quantities.length === 0) return false;
    return quantities.every((n) => n > 0 && n % 100 === 0);
}

export function isContentsReady(
    draft: RequestDraft,
    lines: RequestLine[],
): boolean {
    if (!draft.express) return true;
    if (isExpressRequirementsOnly(draft)) {
        if (!needsPackaging(draft)) return true;
        // Website PRD v4.7 (R36, owner Nov 6): the general step intake doesn't ask what's going
        // inside this phase; the field stays in the payload (empty) for Sales or a later phase.
        if (draft.shipToOptional) return true;
        return draft.packagingContents.trim().length > 0;
    }
    return lines.every((line) => line.contents.trim().length > 0);
}

/**
 * PROD-3181 (POC round 1): request form rules. Absent = round 0 rules.
 * MIGRATION: make these the defaults, drop the parameter, and confirm the
 * backend's 422 contract accepts an empty brief / company address.
 */
export type RequestFormRules = {
    /** Brief optional once the request has a configured product. */
    briefOptionalWithProducts?: boolean;
    /** Company address optional. */
    companyAddressOptional?: boolean;
};

export function hasConfiguredProduct(lines: RequestLine[]): boolean {
    return lines.some(
        (line) =>
            line.quantities.some((n) => n > 0) && line.contents.trim().length > 0,
    );
}

export function isNotesReady(
    draft: RequestDraft,
    lines: RequestLine[] = [],
    rules: RequestFormRules = {},
): boolean {
    if (rules.briefOptionalWithProducts && hasConfiguredProduct(lines)) {
        return true;
    }
    // Owner Nov 2: the step intakes (Type | Upload) accept a brief OR uploaded files — general,
    // and product/service requests opened on the sectioned or step intake. The one-page form still needs the brief.
    if (hasUploadedFile(draft) && (isStepIntake(draft) || draft.stepIntake === true)) {
        return true;
    }
    return draft.notes.trim().length > 0;
}

/** The general quote request on the sectioned or step intakes: no ship-to, brief or files. */
export function isStepIntake(draft: RequestDraft): boolean {
    return Boolean(draft.express && draft.shipToOptional);
}

/** At least one file finished uploading (a file still uploading or failed doesn't count). */
export function hasUploadedFile(draft: RequestDraft): boolean {
    return (draft.referenceImages ?? []).some((i) => Boolean(i.key) || i.status === 'uploaded');
}

export function isShippingReady(draft: RequestDraft): boolean {
    if (draft.shipToOptional) {
        // Optional shells may skip ship-to (service-only, express step intake, products step intake).
        if (draft.express && !hasNeed(draft, NEED_PACKAGING)) return true;
        if (draft.express || draft.entryKind === 'services') return true;
        if (draft.stepIntake && draft.entryKind === 'products') return true;
    }
    // Sectioned Project summary (and any shell with shipToOptional false): city + country required.
    return hasShippingLocation(draft.shippingAddress);
}

export function isCompanyOfficeReady(draft: RequestDraft): boolean {
    return isAddressFieldsValid(draft.companyAddress);
}

export function isContactReady(
    draft: RequestDraft,
    rules: RequestFormRules = {},
): boolean {
    return (
        draft.contactFirstName.trim().length > 0 &&
        draft.contactLastName.trim().length > 0 &&
        isValidEmail(draft.contactEmail) &&
        (rules.companyAddressOptional === true || isCompanyOfficeReady(draft))
    );
}

/** A company website as typed: a host with a dot, scheme optional (e.g. acme.com, https://www.acme.co). */
export function isValidWebsite(value: string | undefined): boolean {
    return isValidWebsiteHost(value ?? '');
}

/**
 * Step intake Contact (owner Nov 2): first and last name and email are needed;
 * phone, company website, and yearly packaging spend are optional. (No company address here.)
 * A filled website still has to look like a host. Source of truth: `contactIntakeSchema`.
 */
export function isIntakeContactReady(draft: RequestDraft): boolean {
    return isContactIntakeValid(draft);
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
    rules: RequestFormRules = {},
): boolean {
    return (
        isItemsReady(draft, lines) &&
        isNotesReady(draft, lines, rules) &&
        isShippingReady(draft) &&
        isContactReady(draft, rules) &&
        isContentsReady(draft, lines) &&
        isExpressQuantityReady(draft, lines) &&
        isServicesReady(draft)
    );
}

export function isExpressCold(draft: RequestDraft): boolean {
    return isExpressRequirementsOnly(draft);
}

export function showFullRail(draft: RequestDraft, lines: RequestLine[]): boolean {
    if (draft.entryKind === 'services') {
        return draft.servicesEnabled || draft.productsExpanded || lines.length > 0;
    }
    if (draft.express) return draft.productsExpanded;
    return true;
}

export function showProductsSection(draft: RequestDraft, lines: RequestLine[]): boolean {
    if (draft.entryKind === 'express' && !draft.productsExpanded) {
        return false;
    }
    if (draft.entryKind === 'services') {
        return draft.productsExpanded || lines.length > 0;
    }
    return true;
}

export function showServicesSection(draft: RequestDraft, lines: RequestLine[]): boolean {
    if (draft.entryKind === 'express' && !draft.productsExpanded) {
        return needsService(draft);
    }
    if (draft.entryKind === 'services') return true;
    // Products entry: services always present as upsell toggle.
    return draft.entryKind === 'products' || showFullRail(draft, lines);
}
