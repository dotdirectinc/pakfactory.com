import {z} from 'zod';
import type {ContactEnquiryFieldView, ContactEnquiryScreenView} from '@/lib/contact/map-channels';

function fieldSchema(field: ContactEnquiryFieldView): z.ZodType<string> {
    const required = field.required;
    if (field.kind === 'email') {
        const base = z.string().trim();
        return required
            ? base.min(1, 'Add a valid email').email('Add a valid email')
            : base.refine((v) => v.length === 0 || z.string().email().safeParse(v).success, {
                  message: 'Add a valid email',
              });
    }
    if (field.kind === 'choice') {
        const values = (field.options ?? []).map((o) => o.value);
        const base = z.string().trim();
        if (!required) return base;
        return base
            .min(1, 'Choose an option')
            .refine((v) => values.includes(v), {message: 'Choose an option'});
    }
    const base = z.string().trim();
    return required ? base.min(1, `Add ${field.label.toLowerCase()}`) : base;
}

/** Zod object for one enquiry screen — keys are Sanity field `_key`s. */
export function screenAnswersSchema(screen: ContactEnquiryScreenView) {
    const shape: Record<string, z.ZodTypeAny> = {};
    for (const field of screen.fields) {
        shape[field.key] = fieldSchema(field);
    }
    return z.object(shape);
}

export type ScreenAnswers = Record<string, string>;

export function emptyScreenAnswers(screen: ContactEnquiryScreenView): ScreenAnswers {
    const out: ScreenAnswers = {};
    for (const field of screen.fields) {
        out[field.key] = '';
    }
    return out;
}

/** Flatten all screens into one Zod object (single-page enquiry form). */
export function enquiryFormSchema(screens: ContactEnquiryScreenView[]) {
    const shape: Record<string, z.ZodTypeAny> = {};
    for (const screen of screens) {
        for (const field of screen.fields) {
            shape[field.key] = fieldSchema(field);
        }
    }
    return z.object(shape);
}

export function emptyEnquiryAnswers(
    screens: ContactEnquiryScreenView[],
): ScreenAnswers {
    const out: ScreenAnswers = {};
    for (const screen of screens) {
        for (const field of screen.fields) {
            out[field.key] = '';
        }
    }
    return out;
}

/** Ordered fields across all screens (Studio order preserved). */
export function flattenEnquiryFields(screens: ContactEnquiryScreenView[]) {
    return screens.flatMap((screen) => screen.fields);
}
