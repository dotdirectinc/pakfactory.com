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

export function normalizeAddress(
    partial: Partial<ShippingAddress> = {},
): ShippingAddress {
    return {
        id: partial.id ?? makeShippingId(),
        label: String(partial.label ?? '').trim(),
        line1: String(partial.line1 ?? '').trim(),
        city: String(partial.city ?? '').trim(),
        region: String(partial.region ?? '').trim(),
        country: String(partial.country ?? '').trim(),
        postalCode: String(partial.postalCode ?? '').trim(),
    };
}
