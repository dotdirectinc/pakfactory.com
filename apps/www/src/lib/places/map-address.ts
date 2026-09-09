import {countryLabel, listRegions, regionLabel} from '@pakfactory/geo';
import type {ShippingAddress} from '@/lib/request/request.storage';

type GoogleAddressComponent = {
    longText?: string;
    shortText?: string;
    types?: string[];
};

function component(
    components: GoogleAddressComponent[],
    type: string,
): GoogleAddressComponent | undefined {
    return components.find((c) => c.types?.includes(type));
}

function textOf(
    c: GoogleAddressComponent | undefined,
    prefer: 'long' | 'short' = 'long',
): string {
    if (!c) return '';
    const long = c.longText?.trim() ?? '';
    const short = c.shortText?.trim() ?? '';
    if (prefer === 'short') return short || long;
    return long || short;
}

function resolveRegionCode(
    countryCode: string,
    adminShort: string,
    adminLong: string,
): string | undefined {
    if (!countryCode) return undefined;
    const regions = listRegions(countryCode);
    if (!regions.length) return undefined;

    const candidate = adminShort
        ? `${countryCode}-${adminShort.toUpperCase()}`
        : '';
    if (candidate && regions.some((r) => r.code === candidate)) {
        return candidate;
    }

    const byShort = regions.find(
        (r) =>
            r.code.endsWith(`-${adminShort.toUpperCase()}`) ||
            r.code.split('-').pop()?.toUpperCase() ===
                adminShort.toUpperCase(),
    );
    if (byShort) return byShort.code;

    const byLabel = regions.find(
        (r) =>
            r.label.toLowerCase() === adminLong.toLowerCase() ||
            r.label.toLowerCase() === adminShort.toLowerCase(),
    );
    return byLabel?.code;
}

/**
 * Map Google Places Essentials addressComponents → ShippingAddress fields.
 * Never stores raw Google payloads.
 */
export function mapAddressComponents(
    components: GoogleAddressComponent[],
    formattedAddress?: string,
): Partial<ShippingAddress> {
    const streetNumber = textOf(component(components, 'street_number'));
    const route = textOf(component(components, 'route'));
    const subpremise = textOf(component(components, 'subpremise'));
    const locality =
        textOf(component(components, 'locality')) ||
        textOf(component(components, 'postal_town')) ||
        textOf(component(components, 'sublocality_level_1')) ||
        textOf(component(components, 'sublocality'));
    const admin = component(components, 'administrative_area_level_1');
    const adminLong = textOf(admin, 'long');
    const adminShort = textOf(admin, 'short');
    const countryComp = component(components, 'country');
    const countryCode = textOf(countryComp, 'short').toUpperCase();
    const postalCode = textOf(component(components, 'postal_code'));

    const line1 = [streetNumber, route].filter(Boolean).join(' ').trim();
    const regionCode = resolveRegionCode(countryCode, adminShort, adminLong);
    const region =
        (regionCode
            ? regionLabel(countryCode, regionCode)
            : undefined) ||
        adminLong ||
        adminShort ||
        undefined;

    const patch: Partial<ShippingAddress> = {};
    if (line1) patch.line1 = line1;
    else if (formattedAddress?.trim()) {
        // Fallback when street parts missing (e.g. establishment-only pick).
        patch.line1 = formattedAddress.trim().split(',')[0]?.trim();
    }
    if (subpremise) patch.line2 = subpremise;
    if (locality) patch.city = locality;
    if (region) patch.region = region;
    if (regionCode) patch.regionCode = regionCode;
    if (countryCode) {
        patch.countryCode = countryCode;
        patch.country = countryLabel(countryCode);
    }
    if (postalCode) patch.postalCode = postalCode;
    return patch;
}
