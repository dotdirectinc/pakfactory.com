/**
 * Maps the builder's local state onto the SUBMIT CONTRACT the backend actually
 * validates — `pakfactory.com-backend/src/contracts/request.ts`.
 *
 * ── One shape ────────────────────────────────────────────────────────────────
 * This repo once had its own `SubmitRequestPayload` (PROD-2346), logged to the dev
 * console on every submit "until submit posts". Submit has posted this shape — the
 * backend's `RequestSubmission`, verified end-to-end through a real Zoho lead — since
 * PROD-2398, so the other shape and its logger were deleted (PROD-2605): a console
 * showing a body that was never sent is worse than none.
 *
 * Pure and side-effect free. It does NOT validate — `submitRequest` gates, and
 * the server's typed 422s are the authority.
 */
import {AXIS_LABEL, type DimensionAxis} from '@pakfactory/sanity/dimension-inputs';
import {resolveProductDims} from '@pakfactory/sanity/resolve-product-dims';
import {
    DIMENSIONS_STEP_KEY,
    dimensionEntryNoteKey,
    visiblePropertySummaries,
    type FaceMeasurements,
} from '@/lib/customization-builder';
import {
    defaultDraftTitle,
    type RequestCustomization,
    type RequestDraft,
    type RequestLine,
    type RequestReferenceImage,
    type ShippingAddress,
} from '@/lib/request/request.storage';

/** Mirrors the backend contract. Kept structural rather than imported: the
 *  backend's Zod schemas are server-side only and www does not depend on zod. */
export type WireAddress = {
    line1?: string;
    line2?: string;
    city?: string;
    region?: string;
    country?: string;
    postalCode?: string;
    /** ISO 3166-1 alpha-2 when chosen from the country list. */
    countryCode?: string;
    /** ISO 3166-2 when chosen from the region list. */
    regionCode?: string;
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
        title?: string;
        productType?: string;
        contents: string;
        quantities: number[];
        moq?: number;
        customizations: WireCustomization[];
        dimensions?: WireDimensions;
        notes?: string;
        attachments: WireAttachment[];
        addedAt: string;
    }[];
    services: string[];
    attachments: WireAttachment[];
    metadata: {
        source: 'Request Builder';
        entryKind: 'express' | 'products' | 'services';
        submittedAt: string;
        /** Buyer-editable Brief Builder name (e.g. "Draft request - Sep 11, 2026"). */
        title?: string;
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
        ...(trimmed(address.line2) ? {line2: address.line2!.trim()} : {}),
        ...(trimmed(address.city) ? {city: address.city!.trim()} : {}),
        ...(trimmed(address.region) ? {region: address.region!.trim()} : {}),
        ...(trimmed(address.country) ? {country: address.country!.trim()} : {}),
        ...(trimmed(address.postalCode) ? {postalCode: address.postalCode!.trim()} : {}),
        ...(trimmed(address.countryCode)
            ? {countryCode: address.countryCode!.trim().toUpperCase()}
            : {}),
        ...(trimmed(address.regionCode)
            ? {regionCode: address.regionCode!.trim().toUpperCase()}
            : {}),
    };
    return Object.keys(next).length ? next : null;
}

export type WireCustomization = {
    id: string;
    label: string;
    category?: string;
    /** The Customization Type, e.g. "Ink" — a category holds several since PROD-2556. */
    type?: string;
    /** The buyer's Property choices on this pick, as shown to them. */
    properties?: string[];
    note?: string;
};

export type WireDimensions = {
    unit: 'in' | 'mm';
    external?: {axis: string; value: string}[];
    internal?: {axis: string; value: string}[];
    externalNote?: string;
    internalNote?: string;
    consultation?: boolean;
};

/**
 * One pick as sales needs it (PROD-2605): the flat `{id, label, category}` the line stores, plus
 * the Type, Property choices and note the builder holds for that option. Picks from before the
 * builder (no builder state) go out as they were.
 */
function toWireCustomization(c: RequestCustomization, line: RequestLine): WireCustomization {
    const builder = line.customizationBuilder;
    const type = line.availableCustomizations?.find((o) => o.id === c.id)?.typeTitle?.trim();
    const properties = visiblePropertySummaries(builder?.propertySelectionSummaries?.[c.id])
        .map((item) => item.label.trim())
        .filter(Boolean);
    const note = trimmed(builder?.entryNotes?.[c.id]);
    return {
        id: c.id,
        label: c.label,
        ...(c.category ? {category: c.category} : {}),
        ...(type ? {type} : {}),
        ...(properties.length ? {properties} : {}),
        ...(note ? {note} : {}),
    };
}

/**
 * The size the buyer entered (PROD-2605). Until now it stayed in the browser: the builder kept it
 * but nothing sent it. Axes come from the product's dimension input, in its order, labelled as the
 * buyer saw them; a face with nothing typed is left out.
 */
export function toWireDimensions(line: RequestLine): WireDimensions | undefined {
    const answer = line.customizationBuilder?.answers?.[DIMENSIONS_STEP_KEY];
    if (!answer || answer.status === 'unset') return undefined;
    if (answer.status === 'not-sure') return {unit: 'in', consultation: true};
    if (!('dimensions' in answer)) return undefined;
    const {unit, external, internal} = answer.dimensions;
    const axes = resolveProductDims(line.dimensionInput ?? 'rectangular', line.dimensionRange).axes;
    const face = (values: FaceMeasurements) => {
        const keys = axes.length ? axes : (Object.keys(values) as DimensionAxis[]);
        return keys
            .map((axis) => ({axis: AXIS_LABEL[axis] ?? axis, value: (values[axis] ?? '').trim()}))
            .filter((m) => m.value);
    };
    const notes = line.customizationBuilder?.entryNotes ?? {};
    const ext = face(external);
    const int = face(internal);
    const externalNote = trimmed(notes[dimensionEntryNoteKey('external')]);
    const internalNote = trimmed(notes[dimensionEntryNoteKey('internal')]);
    if (!ext.length && !int.length && !externalNote && !internalNote) return undefined;
    return {
        unit,
        ...(ext.length ? {external: ext} : {}),
        ...(int.length ? {internal: int} : {}),
        ...(externalNote ? {externalNote} : {}),
        ...(internalNote ? {internalNote} : {}),
    };
}

/**
 * What the backend stores against the RFQ.
 *
 * 🔴 `key`, never `url`. The object key is minted server-side by the presign
 * endpoint and is meaningless without a credential; a URL would either never
 * expire (and leak unreleased packaging design to anyone the lead is forwarded
 * to) or die within days while sales opens leads weeks later — ADR-0013 D3.
 */
type WireAttachment = {
    id: string;
    name: string;
    kind: 'reference';
    key: string;
    bytes?: number;
};

/**
 * Only images that FINISHED uploading are sent.
 *
 * An entry with no `key` is one of three things: still uploading, failed, or
 * restored from a persisted draft whose `blob:` preview died with the tab. None
 * of them names an object that exists, and `persistAttachments` would drop it
 * server-side anyway — silently, leaving the buyer believing a file was attached.
 * Dropping it here keeps the payload honest about what S3 actually holds.
 */
function toWireAttachments(images: RequestReferenceImage[] | undefined): WireAttachment[] {
    return (images ?? [])
        .filter((image): image is RequestReferenceImage & {key: string} =>
            typeof image.key === 'string' && image.key.length > 0)
        .map((image) => ({
            id: image.id,
            name: image.name,
            kind: 'reference' as const,
            key: image.key,
            ...(typeof image.bytes === 'number' && image.bytes > 0
                ? {bytes: image.bytes}
                : {}),
        }));
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
            // 🔴 What the buyer SAW, snapshotted at add-to-request. Without it the
            // server only ever received a slug, so the confirmation receipt, the
            // admin app and the buyer portal all rendered
            // `folding-carton-straight-tuck-end` at people (PROD-2446).
            //
            // Sent rather than resolved server-side on purpose: the server has no
            // Sanity connection, and resolving at send time would let a later
            // product rename silently retitle an old receipt.
            ...(trimmed(line.productTitle) ? {title: line.productTitle!.trim()} : {}),
            ...(trimmed(line.productLineTitle)
                ? {productType: line.productLineTitle!.trim()}
                : {}),
            // The contract has carried `moq` since the start; www never sent it (PROD-2605).
            ...(line.productMoq ? {moq: line.productMoq} : {}),
            customizations: line.customizations.map((c) => toWireCustomization(c, line)),
            ...(() => {
                const dimensions = toWireDimensions(line);
                return dimensions ? {dimensions} : {};
            })(),
            ...(trimmed(line.notes) ? {notes: line.notes!.trim()} : {}),
            attachments: toWireAttachments(line.referenceImages),
            addedAt: line.addedAt,
        })),
        services: [...draft.services],
        // 🔴 This was `[]` with a comment claiming the builder had no
        // request-level picker. It has one — the requirements-step dropzone,
        // which the express lane depends on entirely. It was missed because it
        // never called `createObjectURL`, so a grep for that signature found
        // nothing and absence-of-evidence was read as evidence-of-absence.
        // RFQ-2026-00018 submitted with a file attached and stored none.
        attachments: toWireAttachments(draft.referenceImages),
        metadata: {
            source: 'Request Builder',
            entryKind: draft.entryKind,
            submittedAt: new Date().toISOString(),
            title: trimmed(draft.title) || defaultDraftTitle(),
        },
    };
}
