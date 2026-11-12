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

/**
 * Ship-to on the quote request: same shape as `addressFieldsSchema`, but empty
 * strings are allowed. Country alone (or a blank ship-to) is enough to continue;
 * wire fills missing city/country with N/A.
 */
export const addressFieldsOptionalSchema = z.object({
    line1: z.string(),
    line2: z.string().optional(),
    city: z.string(),
    region: z.string(),
    postalCode: z.string().optional(),
    country: z.string(),
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
