/**
 * Maps the Request Builder's local state onto the v1 submit contract in
 * `request-payload.ts`, so the endpoint (PROD-2398) can be wired against a
 * real payload before anything POSTs.
 *
 * Pure and side-effect free: it reads the draft and lines and returns the
 * payload plus a report of what has no home in the contract yet. Nothing here
 * validates - `submitRequest` already gates submission.
 */

import {digitsOnlySpend} from '@/lib/request/annual-spend';
import type {
    RequestCustomization,
    RequestDraft,
    RequestEntryKind,
    RequestLine,
    ShippingAddress,
} from '@/lib/request/request.storage';
import type {
    Address,
    Contact,
    CustomizationCategory,
    CustomizationSelection,
    Requirements,
    RequestSource,
    SubmitRequestLine,
    SubmitRequestPayload,
} from '@/lib/rfq/request-payload';
import {CUSTOMIZATION_CATEGORIES} from '@/lib/rfq/request-payload';

/**
 * Known catalog → contract category map. The contract still uses a closed set;
 * Sanity slugs outside it fall back to `service` so the payload stays valid.
 */
const CATEGORY_MAP: Record<string, CustomizationCategory> = {
    material: 'material',
    print: 'print_method',
    print_method: 'print_method',
    finish: 'finish',
    service: 'service',
};

/**
 * The lane a buyer entered through, translated to the contract's source. An
 * exhaustive Record so adding a lane fails typecheck here instead of silently
 * defaulting.
 */
const ENTRY_KIND_TO_SOURCE: Record<RequestEntryKind, RequestSource> = {
    express: 'webform',
    products: 'add_to_cart',
    // The contract reserves a third source for services; until it is named,
    // services submit as the cold web form.
    services: 'webform',
};

/** Currency is not captured anywhere in the builder; USD is the assumption. */
const ASSUMED_CURRENCY = 'USD';

/**
 * The contract defines `webform` as "express, no product". A buyer who entered
 * through a web-form lane but chose to include their pooled products is
 * product-led by the time they submit, so the lines win over the lane.
 */
function toSource(
    entryKind: RequestEntryKind,
    hasCatalogLines: boolean,
): RequestSource {
    const lane = ENTRY_KIND_TO_SOURCE[entryKind];
    if (lane === 'webform' && hasCatalogLines) return 'add_to_cart';
    return lane;
}

/**
 * Prod state that the v1 contract has no field for. Logged beside the payload
 * so the gaps are explicit at wiring time instead of being discovered as
 * silently dropped data.
 */
export type PayloadGap = {
    field: string;
    value: unknown;
    reason: string;
};

export type SubmitPayloadReport = {
    payload: SubmitRequestPayload;
    gaps: PayloadGap[];
};

function trimmed(value: string | undefined | null): string | undefined {
    const next = (value ?? '').trim();
    return next || undefined;
}

/**
 * The contract requires line1, city and country; the builder collects all of
 * them optionally, so an incomplete address maps to empty strings rather than
 * being dropped. Returns undefined only when nothing at all was entered.
 */
function toAddress(address: ShippingAddress | null): Address | undefined {
    if (!address) return undefined;
    const hasAny = Boolean(
        trimmed(address.line1) ||
            trimmed(address.city) ||
            trimmed(address.region) ||
            trimmed(address.country) ||
            trimmed(address.postalCode),
    );
    if (!hasAny) return undefined;

    return {
        line1: (address.line1 ?? '').trim(),
        city: (address.city ?? '').trim(),
        state: trimmed(address.region),
        postalCode: trimmed(address.postalCode),
        country: (address.country ?? '').trim(),
    };
}

function toContact(draft: RequestDraft): Contact {
    const firstName = trimmed(draft.contactFirstName);
    const lastName = trimmed(draft.contactLastName);
    const fullName = [firstName, lastName].filter(Boolean).join(' ') || undefined;
    const spendDigits = digitsOnlySpend(draft.annualSpend);
    const spend = spendDigits ? Number(spendDigits) : undefined;

    return {
        email: (draft.contactEmail ?? '').trim(),
        firstName,
        lastName,
        fullName,
        phone: trimmed(draft.contactPhone),
        company: trimmed(draft.contactCompany),
        industry: trimmed(draft.contactIndustry),
        annualSpend: spend,
        annualSpendCurrency: spend ? ASSUMED_CURRENCY : undefined,
        address: toAddress(draft.companyAddress),
        country: trimmed(draft.companyAddress?.country),
    };
}

function toRequirements(draft: RequestDraft): Requirements {
    const shipTo = toAddress(draft.shippingAddress);
    return {
        // targetInHandsDate is deliberately unset - see the timeline gap below.
        shippingAddresses: shipTo ? [shipTo] : undefined,
        notes: trimmed(draft.notes),
    };
}

/**
 * The builder records only that an option was chosen, so `value` mirrors
 * `optionId` and `valueLabel` mirrors `label`. Once options carry a
 * dimension plus a chosen value, those split apart.
 */
function toCustomization(
    customization: RequestCustomization,
): CustomizationSelection {
    const mapped = CATEGORY_MAP[customization.category];
    const category: CustomizationCategory =
        mapped ??
        (CUSTOMIZATION_CATEGORIES.includes(
            customization.category as CustomizationCategory,
        )
            ? (customization.category as CustomizationCategory)
            : 'service');
    return {
        optionId: customization.id,
        category,
        label: customization.label,
        value: customization.id,
        valueLabel: customization.label,
    };
}

function toCatalogLine(line: RequestLine): SubmitRequestLine {
    return {
        id: line.id,
        type: 'catalog',
        // The builder stores a slug; the contract wants the catalog id. The
        // slug is the stable catalog key today, so it stands in for both.
        productId: line.productSlug,
        name: line.productTitle ?? line.productSlug,
        contents: (line.contents ?? '').trim(),
        quantities: line.quantities,
        customizations: line.customizations.map(toCustomization),
        notes: trimmed(line.notes),
    };
}

/**
 * The express lane has no catalog line: the buyer describes what they need in
 * the requirements step, so that becomes a single `described` line.
 */
function toDescribedLine(draft: RequestDraft): SubmitRequestLine {
    const contents = (draft.packagingContents ?? '').trim();
    return {
        id: 'described-1',
        type: 'described',
        productId: null,
        name: contents || 'Custom packaging (described)',
        contents,
        quantities: draft.expressQuantities,
        customizations: [],
    };
}

export function toSubmitPayload(
    draft: RequestDraft,
    lines: RequestLine[],
): SubmitPayloadReport {
    const hasCatalogLines = lines.length > 0;

    const payloadLines = hasCatalogLines
        ? lines.map(toCatalogLine)
        : [toDescribedLine(draft)];

    const payload: SubmitRequestPayload = {
        source: toSource(draft.entryKind, hasCatalogLines),
        contact: toContact(draft),
        requirements: toRequirements(draft),
        lines: payloadLines,
        // `files` needs FileRef ids from an upload step that does not exist
        // yet; see the artwork gap below.
    };

    const gaps: PayloadGap[] = [];

    if (trimmed(draft.timeline)) {
        gaps.push({
            field: 'draft.timeline',
            value: draft.timeline,
            reason: 'Free text ("Need quote by Sept 15"); requirements.targetInHandsDate expects an ISO-8601 date. Needs either a date picker or server-side parsing.',
        });
    }

    if (draft.artworkNames.length > 0) {
        gaps.push({
            field: 'draft.artworkNames',
            value: draft.artworkNames,
            reason: 'Filenames only. FileRef needs id, mimeType and sizeBytes from a real upload step, so payload.files is omitted.',
        });
    }

    const lineImages = lines.flatMap((line) => line.referenceImages ?? []);
    if (lineImages.length > 0) {
        gaps.push({
            field: 'lines[].referenceImages',
            value: lineImages,
            reason: 'Per-line reference images have no upload ids, so line.fileIds is omitted.',
        });
    }

    const countries = [
        draft.shippingAddress?.country,
        draft.companyAddress?.country,
    ].filter((value): value is string => Boolean(trimmed(value)));
    const nonIsoCountries = countries.filter((value) => value.trim().length !== 2);
    if (nonIsoCountries.length > 0) {
        gaps.push({
            field: 'shippingAddress.country / companyAddress.country',
            value: nonIsoCountries,
            reason: 'The builder stores display names ("Canada"); Address.country expects ISO-3166 alpha-2 ("CA"). Needs a country picker with codes, or a server-side lookup.',
        });
    }

    if (draft.services.length > 0) {
        gaps.push({
            field: 'draft.services',
            value: draft.services,
            reason: 'Services are request-level in the builder, but the contract only carries them per line as a `service` customization. Needs a request-level home or a lane decision.',
        });
    }

    if (draft.entryKind === 'services') {
        gaps.push({
            field: 'draft.entryKind',
            value: draft.entryKind,
            reason: `The services lane has no matching RequestSource; ENTRY_KIND_TO_SOURCE maps it to "${payload.source}". The contract reserves a third source value, name TBD.`,
        });
    }

    if (!hasCatalogLines && draft.expressQuantities.length === 0) {
        gaps.push({
            field: 'draft.expressQuantities',
            value: draft.expressQuantities,
            reason: 'Described line has no quantities; the contract requires at least one per line.',
        });
    }

    return {payload, gaps};
}
