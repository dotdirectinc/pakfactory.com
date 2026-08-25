'use client';

import {Input} from '@pakfactory/ui/components/input';
import {Label} from '@pakfactory/ui/components/label';
import {REQUEST_COPY} from '@/lib/copy/request';
import type {ShippingAddress} from '@/lib/request/request.storage';
import {normalizeAddress} from '@/lib/request/shipping-address';

const FIELD_CLASS = 'h-11 rounded-sm border border-input bg-background text-sm';

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
    const city = value?.city ?? '';
    const country = value?.country ?? '';

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
            <div className="mb-2 flex items-baseline justify-between gap-3">
                <Label className="text-xs font-medium">
                    {REQUEST_COPY.shipToLabel}
                </Label>
                <span className="text-xs font-medium text-muted-foreground">
                    {REQUEST_COPY.signIn}
                </span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
                <div>
                    <Label className="mb-1 block text-xs font-medium">City</Label>
                    <Input
                        className={FIELD_CLASS}
                        value={city}
                        onChange={(e) => patch({city: e.target.value})}
                        placeholder="City"
                    />
                </div>
                <div>
                    <Label className="mb-1 block text-xs font-medium">
                        Country
                    </Label>
                    <Input
                        className={FIELD_CLASS}
                        value={country}
                        onChange={(e) => patch({country: e.target.value})}
                        placeholder="Country"
                    />
                </div>
            </div>
        </div>
    );
}
