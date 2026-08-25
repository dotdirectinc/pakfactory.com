import type {ShippingAddress} from '@/lib/request/request.storage';

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

export function formatAddressLines(
    address: ShippingAddress | null | undefined,
): string[] {
    if (!address || typeof address !== 'object') return [];
    const lines: string[] = [];
    if (String(address.label ?? '').trim()) lines.push(address.label!.trim());
    if (String(address.line1 ?? '').trim()) lines.push(address.line1!.trim());
    const cityRegion = [address.city, address.region, address.postalCode]
        .map((p) => String(p ?? '').trim())
        .filter(Boolean)
        .join(', ');
    if (cityRegion) lines.push(cityRegion);
    if (String(address.country ?? '').trim()) {
        lines.push(address.country!.trim());
    }
    return lines;
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
