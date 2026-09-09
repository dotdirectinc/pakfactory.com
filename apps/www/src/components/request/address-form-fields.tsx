'use client';

import {Input} from '@pakfactory/ui/components/input';
import {Label} from '@pakfactory/ui/components/label';
import {cn} from '@pakfactory/ui/lib/utils';
import {AddressLineAutocomplete} from '@/components/request/address-line-autocomplete';
import {
    LocationCountryField,
    LocationRegionField,
    shouldShowRegionField,
} from '@/components/request/location-country-region-fields';
import type {ShippingAddress} from '@/lib/request/request.storage';

const FIELD_CLASS = 'h-11 rounded-sm border border-input bg-background text-sm';

export type AddressFormFieldsValue = Pick<
    ShippingAddress,
    | 'line1'
    | 'line2'
    | 'city'
    | 'region'
    | 'country'
    | 'postalCode'
    | 'countryCode'
    | 'regionCode'
>;

type AddressFormFieldsProps = {
    value: AddressFormFieldsValue;
    onPatch: (patch: Partial<ShippingAddress>) => void;
    className?: string;
};

/**
 * Shopify-style address block (geography only): Country → Street → Apt →
 * City | Region | Postal. Props-only; parents own chrome and validation.
 */
export function AddressFormFields({
    value,
    onPatch,
    className,
}: AddressFormFieldsProps) {
    const location = {
        country: value.country,
        countryCode: value.countryCode,
        region: value.region,
        regionCode: value.regionCode,
    };
    const showRegion = shouldShowRegionField(location);

    return (
        <div className={cn('grid gap-3', className)}>
            <LocationCountryField value={location} onPatch={onPatch} />

            <div>
                <Label className="mb-1 block text-xs font-medium">Address</Label>
                <AddressLineAutocomplete
                    value={value.line1 ?? ''}
                    countryCode={value.countryCode}
                    inputClassName={FIELD_CLASS}
                    onLine1Change={(line1) => onPatch({line1})}
                    onAddressFill={(patch) => onPatch(patch)}
                />
            </div>

            <div>
                <Label className="mb-1 block text-xs font-medium">
                    Apartment, suite, etc.
                    <span className="ml-1 font-normal text-muted-foreground">
                        (optional)
                    </span>
                </Label>
                <Input
                    className={FIELD_CLASS}
                    value={value.line2 ?? ''}
                    onChange={(e) => onPatch({line2: e.target.value})}
                    placeholder="Apartment, suite, etc."
                    autoComplete="address-line2"
                />
            </div>

            <div
                className={cn(
                    'grid gap-3',
                    showRegion
                        ? 'sm:grid-cols-3'
                        : 'sm:grid-cols-2',
                )}
            >
                <div>
                    <Label className="mb-1 block text-xs font-medium">
                        City
                    </Label>
                    <Input
                        className={FIELD_CLASS}
                        value={value.city ?? ''}
                        onChange={(e) => onPatch({city: e.target.value})}
                        placeholder="City"
                        autoComplete="address-level2"
                    />
                </div>
                {showRegion ? (
                    <LocationRegionField value={location} onPatch={onPatch} />
                ) : null}
                <div>
                    <Label className="mb-1 block text-xs font-medium">
                        Postal code
                    </Label>
                    <Input
                        className={FIELD_CLASS}
                        value={value.postalCode ?? ''}
                        onChange={(e) => onPatch({postalCode: e.target.value})}
                        placeholder="Postal code"
                        autoComplete="postal-code"
                    />
                </div>
            </div>
        </div>
    );
}
