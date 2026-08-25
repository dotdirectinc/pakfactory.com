'use client';

import {Input} from '@pakfactory/ui/components/input';
import {Label} from '@pakfactory/ui/components/label';
import type {ProfileAddress} from '@/lib/account/profile-mock';
import {ACCOUNT_COPY} from '@/lib/copy/account';

const ADDRESS_FIELDS = [
    ['line1', ACCOUNT_COPY.fieldLine1],
    ['line2', ACCOUNT_COPY.fieldLine2],
    ['city', ACCOUNT_COPY.fieldCity],
    ['region', ACCOUNT_COPY.fieldRegion],
    ['postalCode', ACCOUNT_COPY.fieldPostal],
    ['country', ACCOUNT_COPY.fieldCountry],
] as const;

type ProfileAddressFieldsProps = {
    idPrefix: string;
    value: ProfileAddress;
    onChange: (next: ProfileAddress) => void;
};

export function ProfileAddressFields({
    idPrefix,
    value,
    onChange,
}: ProfileAddressFieldsProps) {
    return (
        <>
            {ADDRESS_FIELDS.map(([key, label]) => (
                <div key={key} className="flex flex-col gap-2">
                    <Label
                        htmlFor={`${idPrefix}-${key}`}
                        className="text-xs font-medium"
                    >
                        {label}
                    </Label>
                    <Input
                        id={`${idPrefix}-${key}`}
                        value={value[key]}
                        onChange={(event) =>
                            onChange({...value, [key]: event.target.value})
                        }
                        className="h-11 rounded-sm"
                    />
                </div>
            ))}
        </>
    );
}
