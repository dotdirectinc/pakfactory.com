/**
 * Maps the builder's local state onto the SUBMIT CONTRACT the backend actually
 * validates — `pakfactory.com-backend/src/contracts/request.ts`.
 *
 * ── Why this exists next to `to-submit-payload.ts` ──────────────────────────
 * Two payload shapes were designed independently for one endpoint: this repo's
 * `SubmitRequestPayload` (PROD-2346, "logged in dev so the backend can build
 * against a fixed shape") and the backend's `RequestSubmission` (PROD-2398,
 * reconstructed from shipped builder state). Neither was ratified by product or
 * a BA — they are two proposals from one author that drifted.
 *
 * The backend's shape wins because it is the one that is implemented, tested,
 * and verified end-to-end through a real Zoho lead. `SubmitRequestPayload`
 * becomes what it always was in practice: a description of the builder's own
 * state. This module is the boundary between the two.
 *
 * Pure and side-effect free. It does NOT validate — `submitRequest` gates, and
 * the server's typed 422s are the authority.
 */
import type {
    RequestCustomization,
    RequestDraft,
    RequestLine,
    ShippingAddress,
} from '@/lib/request/request.storage';

/** Mirrors the backend contract. Kept structural rather than imported: the
 *  backend's Zod schemas are server-side only and www does not depend on zod. */
export type WireAddress = {
    line1?: string;
    city?: string;
    region?: string;
    country?: string;
    postalCode?: string;
};

export type WireSubmission = {
    draftId: string;
    submissionId: string;
    contact: {
        firstName: string;
        lastName: string;
        email: string;
        phone?: string;
        company?: string;
        industry?: string;
    };
    requirements: {
        notes: string;
        timeline?: string;
        packagingContents?: string;
        expressQuantities?: number[];
        annualSpendBand?: string;
    };
    shipTo: WireAddress | null;
    companyOffice: WireAddress | null;
    lines: {
        id: string;
        productSlug: string;
        contents: string;
        quantities: number[];
        moq?: number;
        customizations: {id: string; label: string; category?: string}[];
        notes?: string;
        attachments: never[];
        addedAt: string;
    }[];
    services: string[];
    attachments: never[];
    metadata: {
        source: 'Request Builder';
        entryKind: 'express' | 'products' | 'services';
        submittedAt: string;
    };
};

function trimmed(value: string | undefined | null): string | undefined {
    const next = (value ?? '').trim();
    return next || undefined;
}

/** The builder's address and the contract's differ only in optionality, so this
 *  is a narrowing rather than a translation. `null` when nothing was entered —
 *  the contract distinguishes "no address" from "an empty one". */
function toWireAddress(address: ShippingAddress | null): WireAddress | null {
    if (!address) return null;
    const next: WireAddress = {
        ...(trimmed(address.line1) ? {line1: address.line1!.trim()} : {}),
        ...(trimmed(address.city) ? {city: address.city!.trim()} : {}),
        ...(trimmed(address.region) ? {region: address.region!.trim()} : {}),
        ...(trimmed(address.country) ? {country: address.country!.trim()} : {}),
        ...(trimmed(address.postalCode) ? {postalCode: address.postalCode!.trim()} : {}),
    };
    return Object.keys(next).length ? next : null;
}

function toWireCustomization(c: RequestCustomization) {
    return {id: c.id, label: c.label, ...(c.category ? {category: c.category} : {})};
}

export function toWireSubmission(
    draft: RequestDraft,
    lines: RequestLine[],
    submissionId: string,
): WireSubmission {
    return {
        draftId: draft.id,
        // Per submit CLICK, not per draft (ADR-0012 D10): a transport retry
        // repeats it and collapses; a deliberate resubmit brings a new one and
        // correctly produces a second RFQ for sales to judge.
        submissionId,
        contact: {
            firstName: draft.contactFirstName.trim(),
            lastName: draft.contactLastName.trim(),
            email: draft.contactEmail.trim(),
            ...(trimmed(draft.contactPhone) ? {phone: draft.contactPhone.trim()} : {}),
            ...(trimmed(draft.contactCompany) ? {company: draft.contactCompany.trim()} : {}),
            ...(trimmed(draft.contactIndustry) ? {industry: draft.contactIndustry.trim()} : {}),
        },
        requirements: {
            notes: draft.notes.trim(),
            ...(trimmed(draft.timeline) ? {timeline: draft.timeline.trim()} : {}),
            ...(trimmed(draft.packagingContents)
                ? {packagingContents: draft.packagingContents.trim()}
                : {}),
            // ALL tiers, not just the first. The express step lets a buyer add
            // several, and the contract was widened to carry them
            // (pakfactory.com-server#87) rather than have this drop the rest.
            ...(draft.expressQuantities.length
                ? {expressQuantities: [...draft.expressQuantities]}
                : {}),
            ...(trimmed(draft.annualSpend) ? {annualSpendBand: draft.annualSpend.trim()} : {}),
        },
        shipTo: toWireAddress(draft.shippingAddress),
        companyOffice: toWireAddress(draft.companyAddress),
        lines: lines.map((line) => ({
            id: line.id,
            productSlug: line.productSlug,
            contents: (line.contents ?? '').trim(),
            quantities: line.quantities,
            customizations: line.customizations.map(toWireCustomization),
            ...(trimmed(line.notes) ? {notes: line.notes!.trim()} : {}),
            // 🔴 Deliberately empty, NOT line.referenceImages.
            //
            // Those urls come from `URL.createObjectURL(file)` — blob: urls that
            // live only in the tab that made them. Sending one would store a
            // permanently dead link and print it into the Zoho Description as if
            // sales could open it. Attachments wait for a real upload step
            // (signed direct-to-storage); until then, no link is better than a
            // broken one presented as working.
            attachments: [],
            addedAt: line.addedAt,
        })),
        services: [...draft.services],
        attachments: [],
        metadata: {
            source: 'Request Builder',
            entryKind: draft.entryKind,
            submittedAt: new Date().toISOString(),
        },
    };
}
