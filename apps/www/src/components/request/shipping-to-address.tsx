'use client';

import {useState} from 'react';
import {Button} from '@pakfactory/ui/components/button';
import {Label} from '@pakfactory/ui/components/label';
import {LoginDialog} from '@/components/login/login-dialog';
import {AddressFormFields} from '@/components/request/address-form-fields';
import {REQUEST_COPY} from '@/lib/copy/request';
import type {ShippingAddress} from '@/lib/request/request.storage';
import {normalizeAddress} from '@/lib/request/shipping-address';

type ShippingToAddressProps = {
    value: ShippingAddress | null;
    onChange: (address: ShippingAddress) => void;
    className?: string;
};

export function ShippingToAddress({
    value,
    onChange,
    className,
}: ShippingToAddressProps) {
    const [loginOpen, setLoginOpen] = useState(false);

    function patch(next: Partial<ShippingAddress>) {
        onChange(
            normalizeAddress({
                ...(value ?? {}),
                ...next,
            }),
        );
    }

    return (
        <div className={className}>
            <div className="mb-4 flex items-baseline justify-between gap-3">
                <Label className="text-sm font-medium">
                    {REQUEST_COPY.shipToLabel}
                </Label>
                <Button
                    type="button"
                    variant="link"
                    className="h-auto cursor-pointer px-0 text-xs font-medium text-muted-foreground underline underline-offset-4"
                    onClick={() => setLoginOpen(true)}
                >
                    {REQUEST_COPY.signIn}
                </Button>
            </div>
            <AddressFormFields
                value={{
                    line1: value?.line1,
                    line2: value?.line2,
                    city: value?.city,
                    region: value?.region,
                    country: value?.country,
                    postalCode: value?.postalCode,
                    countryCode: value?.countryCode,
                    regionCode: value?.regionCode,
                }}
                onPatch={patch}
            />
            <LoginDialog open={loginOpen} onOpenChange={setLoginOpen} />
        </div>
    );
}
