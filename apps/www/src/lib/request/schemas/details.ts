import {z} from 'zod';

/** “Something else” service free-text when that option is selected. */
export const serviceOtherSchema = z.object({
    serviceOther: z.string().trim().min(1, 'Tell us the other service you need'),
});

export type ServiceOtherValues = z.infer<typeof serviceOtherSchema>;

/** Express / general packaging quantities — positive multiples of 100. */
export const expressQuantitySchema = z
    .number()
    .int()
    .positive()
    .refine((n) => n % 100 === 0, {message: 'Quantities go in hundreds'});

export const expressQuantitiesSchema = z
    .array(expressQuantitySchema)
    .min(1, 'Add the quantities to quote');

/** Project brief — non-empty when files do not cover the notes gate. */
export const projectNotesSchema = z.object({
    notes: z.string().trim().min(1, 'Describe your project or add a file'),
});

export type ProjectNotesValues = z.infer<typeof projectNotesSchema>;
