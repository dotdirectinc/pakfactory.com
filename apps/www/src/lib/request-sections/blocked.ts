/**
 * Sectioned request (owner Nov 6): why the next step's Continue is off — one short line shown beside it,
 * naming the first thing still missing in the open step. PORTABLE (pure, no UI).
 */
import {draftNeeds, NEED_PACKAGING} from '@/lib/intake/needs';
import type {RequestFlow} from '@/lib/intake/routes';
import {isServicesStepReady} from '@/lib/intake/flows/services-ready';
import type {RequestDraft, RequestLine} from '@/lib/request/request.storage';
import {OTHER_SERVICE_ID} from '@/lib/request/service-label';
import {isIntakeContactReady, isNotesReady, isShippingReady} from '@/lib/request/validation';
import {
    contactIntakeFromDraft,
    contactIntakeSchema,
} from '@/lib/request/schemas/contact';
import {
    expressQuantitiesSchema,
    serviceOtherSchema,
} from '@/lib/request/schemas/details';
import type {IntakeContext} from '@/lib/intake/types';
import type {SectionKey} from '@/lib/request-sections/flow';

export function blockedReason(
    k: SectionKey,
    flow: RequestFlow,
    draft: RequestDraft,
    lines: RequestLine[],
    rules: IntakeContext['rules'],
): string | null {
    if (k === 'products') {
        if (!lines.length) return 'Select at least one item';
        if (lines.some((l) => !l.quantities.some((n) => n > 0))) return 'Add a quantity for each item';
        return null;
    }
    if (k === 'details') {
        if (flow === 'general') {
            if (!(draft.needPicked || draft.needFromDoor) || !draftNeeds(draft).length) {
                return 'Choose what you need';
            }
            if (draftNeeds(draft).includes(NEED_PACKAGING)) {
                const qty = expressQuantitiesSchema.safeParse(draft.expressQuantities);
                if (!qty.success) {
                    return qty.error.issues[0]?.message ?? 'Add the quantities to quote';
                }
            }
        }
        const servicesOn =
            flow === 'general' ? draftNeeds(draft).includes('service') : Boolean(draft.servicesEnabled);
        if (servicesOn && !isServicesStepReady(draft)) {
            if (draft.services.includes(OTHER_SERVICE_ID)) {
                const other = serviceOtherSchema.safeParse({
                    serviceOther: draft.serviceOther ?? '',
                });
                if (!other.success) {
                    return other.error.issues[0]?.message ?? 'Tell us the other service you need';
                }
            }
            return 'Pick at least one service';
        }
        if (!isShippingReady(draft)) return 'Add a shipping location';
        // Product: describe/files optional (Items carry the quote). General still needs a brief or file.
        if (flow !== 'product' && !isNotesReady(draft, lines, rules)) {
            return 'Describe your project or add a file';
        }
        return null;
    }
    if (k === 'contact') {
        if (!isIntakeContactReady(draft)) {
            const parsed = contactIntakeSchema.safeParse(contactIntakeFromDraft(draft));
            if (!parsed.success) {
                return parsed.error.issues[0]?.message ?? 'Add your contact details';
            }
        }
        return null;
    }
    // Submit has no Continue gate — the Submit button is the action.
    return null;
}
