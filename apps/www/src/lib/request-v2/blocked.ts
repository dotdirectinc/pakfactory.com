/**
 * RFQ v2 (owner Nov 6): why the next step's Continue is off — one short line shown beside it,
 * naming the first thing still missing in the open step. PORTABLE (pure, no UI).
 */
import {draftNeeds, NEED_PACKAGING} from '@/lib/intake/needs';
import type {RequestFlow} from '@/lib/intake/routes';
import {isServicesStepReady} from '@/lib/intake/flows/services-ready';
import type {RequestDraft, RequestLine} from '@/lib/request/request.storage';
import {OTHER_SERVICE_ID} from '@/lib/request/service-label';
import {isIntakeContactReady, isNotesReady, isValidEmail, isValidWebsite} from '@/lib/request/validation';
import type {IntakeContext} from '@/lib/intake/types';
import type {SectionKey} from '@/lib/request-v2/flow';

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
            if (!(draft.needPicked || draft.needFromDoor) || !draftNeeds(draft).length) return 'Choose what you need';
            if (draftNeeds(draft).includes(NEED_PACKAGING)) {
                if (!draft.expressQuantities.length) return 'Add the quantities to quote';
                if (!draft.expressQuantities.every((n) => n > 0 && n % 100 === 0)) return 'Quantities go in hundreds';
            }
        }
        const servicesOn = flow === 'general' ? draftNeeds(draft).includes('service') : Boolean(draft.servicesEnabled);
        if (servicesOn && !isServicesStepReady(draft)) {
            return draft.services.includes(OTHER_SERVICE_ID) && !draft.serviceOther?.trim() ? 'Tell us the other service you need' : 'Pick at least one service';
        }
        // Product: describe/files optional (Items carry the quote). General still needs a brief or file.
        if (flow !== 'product' && !isNotesReady(draft, lines, rules)) return 'Describe your project or add a file';
        return null;
    }
    if (!isIntakeContactReady(draft)) {
        if (!draft.contactFirstName.trim() || !draft.contactLastName.trim()) return 'Add your first and last name';
        if (!isValidEmail(draft.contactEmail)) return 'Add a valid email';
        if (draft.contactWebsite && !isValidWebsite(draft.contactWebsite)) return 'Check the website address';
    }
    return null;
}
