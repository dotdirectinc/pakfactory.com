'use client';

import {useState} from 'react';
import {Button} from '@pakfactory/ui/components/button';
import {Input} from '@pakfactory/ui/components/input';
import {Label} from '@pakfactory/ui/components/label';
import {LoginDialog} from '@/components/login/login-dialog';
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
    const [loginOpen, setLoginOpen] = useState(false);
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
            <LoginDialog open={loginOpen} onOpenChange={setLoginOpen} />
        </div>
    );
}
