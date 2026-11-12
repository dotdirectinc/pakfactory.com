import {z} from 'zod';
import {addressFieldsSchema} from '@/lib/request/schemas/address';
import {contactEmailSchema} from '@/lib/request/schemas/contact';

export const profileContactSchema = z.object({
    name: z.string().trim().min(1, 'Add your name'),
    email: contactEmailSchema,
    phone: z.string(),
    company: z.string(),
    industry: z.string(),
});

export type ProfileContactValues = z.infer<typeof profileContactSchema>;

export const profileAddressSchema = addressFieldsSchema;

export type ProfileAddressValues = z.infer<typeof profileAddressSchema>;
