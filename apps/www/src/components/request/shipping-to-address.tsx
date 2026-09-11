'use client';

import {AddressPickerBlock} from '@/components/request/address-picker-block';
import {REQUEST_COPY} from '@/lib/copy/request';
import type {ShippingAddress} from '@/lib/request/request.storage';

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
    return (
        <AddressPickerBlock
            value={value}
            onChange={onChange}
            className={className}
            title={REQUEST_COPY.shipToLabel}
            dialogTitle={REQUEST_COPY.shipToLabel}
            fallbackLabel={REQUEST_COPY.shippingAddressFallbackLabel}
            showSignInWhenSignedOut
        />
    );
}
