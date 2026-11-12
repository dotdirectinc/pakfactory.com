'use client';

import {forwardRef, useImperativeHandle} from 'react';
import {zodResolver} from '@hookform/resolvers/zod';
import {useForm} from 'react-hook-form';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@pakfactory/ui/components/form';
import {Input} from '@pakfactory/ui/components/input';
import {
    profileAddressSchema,
    type ProfileAddressValues,
} from '@/lib/account/profile-schemas';
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

export type ProfileAddressFieldsHandle = {
    trigger: () => Promise<boolean>;
    getValues: () => ProfileAddressValues;
};

type ProfileAddressFieldsProps = {
    idPrefix: string;
    value: ProfileAddress;
    onChange: (next: ProfileAddress) => void;
};

export const ProfileAddressFields = forwardRef<
    ProfileAddressFieldsHandle,
    ProfileAddressFieldsProps
>(function ProfileAddressFields({idPrefix, value, onChange}, ref) {
    const form = useForm<ProfileAddressValues>({
        resolver: zodResolver(profileAddressSchema),
        mode: 'onBlur',
        reValidateMode: 'onChange',
        values: {
            line1: value.line1,
            line2: value.line2,
            city: value.city,
            region: value.region,
            postalCode: value.postalCode,
            country: value.country,
        },
    });

    useImperativeHandle(ref, () => ({
        trigger: () => form.trigger(),
        getValues: () => form.getValues(),
    }));

    return (
        <Form {...form}>
            <div className="flex flex-col gap-4">
                {ADDRESS_FIELDS.map(([key, label]) => (
                    <FormField
                        key={key}
                        control={form.control}
                        name={key}
                        render={({field}) => (
                            <FormItem>
                                <FormLabel
                                    htmlFor={`${idPrefix}-${key}`}
                                    className="text-xs font-medium"
                                >
                                    {label}
                                </FormLabel>
                                <FormControl>
                                    <Input
                                        id={`${idPrefix}-${key}`}
                                        className="h-11 rounded-sm"
                                        {...field}
                                        value={field.value ?? ''}
                                        onChange={(e) => {
                                            field.onChange(e);
                                            const next = {
                                                ...form.getValues(),
                                                [key]: e.target.value,
                                            };
                                            onChange({
                                                ...value,
                                                line1: next.line1,
                                                line2: next.line2 ?? '',
                                                city: next.city,
                                                region: next.region,
                                                postalCode: next.postalCode ?? '',
                                                country: next.country,
                                            });
                                        }}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                ))}
            </div>
        </Form>
    );
});
