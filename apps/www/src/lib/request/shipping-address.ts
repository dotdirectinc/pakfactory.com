import type {ShippingAddress} from '@/lib/request/request.storage';

export {formatAddressLines} from '@pakfactory/domain/shipping-address';

export function makeShippingId(): string {
    return Math.random().toString(36).slice(2, 10);
}

export function hasShippingLocation(
    address: ShippingAddress | null | undefined,
): boolean {
    if (!address || typeof address !== 'object') return false;
    return Boolean(
        String(address.city ?? '').trim() ||
            String(address.country ?? '').trim(),
    );
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
