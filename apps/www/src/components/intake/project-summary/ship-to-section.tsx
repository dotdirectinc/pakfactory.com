'use client';

import {Label} from '@pakfactory/ui/components/label';
import {LocationCountryField} from '@/components/request/location-country-region-fields';
import {REQUEST_COPY} from '@/lib/copy/request';
import type {RequestDraft, ShippingAddress} from '@/lib/request/request.storage';

/**
 * Project summary (general packaging) — country only.
 * Persists into `draft.shippingAddress`; street / city are not asked yet.
 */
export function ShipToSection({
    draft,
    onPatch,
}: {
    draft: RequestDraft;
    onPatch: (patch: Partial<RequestDraft>) => void;
}) {
    const address = draft.shippingAddress;

    function patchCountry(patch: Partial<ShippingAddress>) {
        onPatch({
            shippingAddress: {
                ...(address ?? {}),
                ...patch,
            },
        });
    }

    return (
        <div className="flex flex-col gap-2">
            <Label className="block text-base font-medium">{REQUEST_COPY.shipCountryLabel}</Label>
            <LocationCountryField
                hideLabel
                value={{
                    country: address?.country,
                    countryCode: address?.countryCode,
                    region: address?.region,
                    regionCode: address?.regionCode,
                }}
                onPatch={patchCountry}
            />
        </div>
    );
}
