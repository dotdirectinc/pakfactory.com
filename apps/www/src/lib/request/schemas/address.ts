import {z} from 'zod';

/** Company / shipping address lines used on Brief Builder and profile dialogs. */
export const addressFieldsSchema = z.object({
    line1: z.string().trim().min(1, 'Add a street address'),
    line2: z.string().optional(),
    city: z.string().trim().min(1, 'Add a city'),
    region: z.string().trim().min(1, 'Add a state / province'),
    postalCode: z.string().optional(),
    country: z.string().trim().min(1, 'Add a country'),
});

export type AddressFieldsValues = z.infer<typeof addressFieldsSchema>;

export function addressFieldsFromValue(value: {
    line1?: string;
    line2?: string;
    city?: string;
    region?: string;
    postalCode?: string;
    country?: string;
} | null | undefined): AddressFieldsValues {
    return {
        line1: value?.line1 ?? '',
        line2: value?.line2 ?? '',
        city: value?.city ?? '',
        region: value?.region ?? '',
        postalCode: value?.postalCode ?? '',
        country: value?.country ?? '',
    };
}

export function isAddressFieldsValid(
    value: Parameters<typeof addressFieldsFromValue>[0],
): boolean {
    return addressFieldsSchema.safeParse(addressFieldsFromValue(value)).success;
}
