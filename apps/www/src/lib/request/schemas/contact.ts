import {z} from 'zod';

/** Host with a dot; optional http(s):// — same rule as legacy `isValidWebsite`. */
export function isValidWebsiteHost(value: string): boolean {
    const v = value.trim().replace(/^https?:\/\//i, '');
    return /^[^\s/.]+(\.[^\s/.]+)+(\/\S*)?$/.test(v);
}

export const optionalWebsiteSchema = z
    .string()
    .trim()
    .refine((v) => v.length === 0 || isValidWebsiteHost(v), {
        message: 'Enter a valid website (e.g. acme.com)',
    });

export const contactEmailSchema = z
    .string()
    .trim()
    .min(1, 'Add a valid email')
    .email('Add a valid email');

/**
 * Sectioned / step intake Contact (names + email required; phone, website, spend optional).
 * A filled website must look like a host.
 */
export const contactIntakeSchema = z.object({
    contactFirstName: z.string().trim().min(1, 'Add your first name'),
    contactLastName: z.string().trim().min(1, 'Add your last name'),
    contactEmail: contactEmailSchema,
    contactPhone: z.string(),
    contactWebsite: optionalWebsiteSchema,
    annualSpend: z.string().optional(),
    annualSpendCurrency: z.enum(['USD', 'CAD']).optional(),
});

export type ContactIntakeValues = z.infer<typeof contactIntakeSchema>;

/** Brief Builder Your information: names + email; optional phone / company / industry (no website). */
export const contactBriefBuilderSchema = contactIntakeSchema
    .omit({
        contactWebsite: true,
        annualSpend: true,
        annualSpendCurrency: true,
    })
    .extend({
        contactCompany: z.string().optional(),
        contactIndustry: z.string().optional(),
    });

export type ContactBriefBuilderValues = z.infer<typeof contactBriefBuilderSchema>;

export function contactBriefBuilderFromDraft(draft: {
    contactFirstName: string;
    contactLastName: string;
    contactEmail: string;
    contactPhone: string;
    contactCompany?: string;
    contactIndustry?: string;
}): ContactBriefBuilderValues {
    return {
        contactFirstName: draft.contactFirstName,
        contactLastName: draft.contactLastName,
        contactEmail: draft.contactEmail,
        contactPhone: draft.contactPhone,
        contactCompany: draft.contactCompany ?? '',
        contactIndustry: draft.contactIndustry ?? '',
    };
}

export function contactIntakeFromDraft(draft: {
    contactFirstName: string;
    contactLastName: string;
    contactEmail: string;
    contactPhone: string;
    contactWebsite?: string;
    annualSpend?: string;
    annualSpendCurrency?: 'USD' | 'CAD';
}): ContactIntakeValues {
    return {
        contactFirstName: draft.contactFirstName,
        contactLastName: draft.contactLastName,
        contactEmail: draft.contactEmail,
        contactPhone: draft.contactPhone,
        contactWebsite: draft.contactWebsite ?? '',
        annualSpend: draft.annualSpend,
        annualSpendCurrency: draft.annualSpendCurrency,
    };
}

export function isContactIntakeValid(draft: {
    contactFirstName: string;
    contactLastName: string;
    contactEmail: string;
    contactPhone: string;
    contactWebsite?: string;
}): boolean {
    return contactIntakeSchema.safeParse(contactIntakeFromDraft(draft)).success;
}
