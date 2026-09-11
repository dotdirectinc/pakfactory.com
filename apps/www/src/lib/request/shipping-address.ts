import type {ShippingAddress} from '@/lib/request/request.storage';

export {formatAddressLines} from '@pakfactory/domain/shipping-address';

export function makeShippingId(): string {
    return Math.random().toString(36).slice(2, 10);
}

/**
 * A shipping location needs BOTH the city and the country.
 *
 * ⚠️ This was `||` and the server required the country alone, so the two rules
 * disagreed in both directions: a city-only draft enabled the submit button and
 * was then rejected with a 422, while a country-only draft passed both despite
 * being unquotable. The server's rule even claimed to mirror this one.
 *
 * Same rule as `contract.rules.ts` → `hasLocation`, which the backend enforces.
 * If you change one, change both.
 */
export function hasShippingLocation(
    address: ShippingAddress | null | undefined,
): boolean {
    if (!address || typeof address !== 'object') return false;
    const city = String(address.city ?? '').trim();
    const country = String(address.country ?? '').trim();
    return Boolean(city && country);
}

/** One-line middot summary for address cards (line1 · city, region · country). */
export function formatAddressSummaryLine(address: ShippingAddress): string {
    const cityRegion = [address.city, address.region]
        .map((part) => String(part ?? '').trim())
        .filter(Boolean)
        .join(', ');
    return [address.line1, cityRegion, address.country]
        .map((part) => String(part ?? '').trim())
        .filter(Boolean)
        .join(' · ');
}

/**
 * Merge/coerce an address for draft UI state.
 *
 * Free-text fields are **not** trimmed here — this runs on every keystroke via
 * ship-to / company-office patches, and trimming would eat spaces mid-type.
 * Trim at wire/submit instead (`to-wire-payload` / `to-submit-payload`).
 */
export function normalizeAddress(
    partial: Partial<ShippingAddress> = {},
): ShippingAddress {
    const countryCode = partial.countryCode?.trim().toUpperCase() || undefined;
    const regionCode = partial.regionCode?.trim().toUpperCase() || undefined;
    return {
        id: partial.id ?? makeShippingId(),
        label: String(partial.label ?? ''),
        line1: String(partial.line1 ?? ''),
        line2: String(partial.line2 ?? ''),
        city: String(partial.city ?? ''),
        region: String(partial.region ?? ''),
        country: String(partial.country ?? ''),
        postalCode: String(partial.postalCode ?? ''),
        ...(countryCode ? {countryCode} : {}),
        ...(regionCode ? {regionCode} : {}),
    };
}
