import type {IntakeFlowDef} from '@/lib/intake/types';
import {draftNeeds} from '@/lib/intake/needs';
import type {IntakeScreenKey} from '@/lib/intake/routes';
import {
    isIntakeContactReady,
    isNotesReady,
    isServicesReady,
    isShippingReady,
    needsPackaging,
} from '@/lib/request/validation';

/**
 * General request screens, shared by every shell.
 * Website PRD v4.7 (R36, owner Nov 6): Project details → Contact (summary card when signed in) →
 * Review (not a rail row). What you need is no longer its own step: Project details opens with the
 * choice (or hides it when the door set the need). Was Quote type → Project details → Contact (Nov 2–3).
 */
export const GENERAL_REQUEST_FLOW: IntakeFlowDef<IntakeScreenKey> = {
    id: 'general',
    screens: [
        {
            key: 'details',
            show: () => true,
            ready: ({draft, rules}) =>
                Boolean((draft.needPicked || draft.needFromDoor) && draftNeeds(draft).length) &&
                // Checked directly: the shared helpers pass anything while the draft isn't (yet) express.
                // v4.7 (owner Nov 6): quantity only; what's going inside isn't asked this phase.
                (!needsPackaging(draft) ||
                    (draft.expressQuantities.length > 0 && draft.expressQuantities.every((n) => n > 0 && n % 100 === 0))) &&
                isServicesReady(draft) &&
                isNotesReady(draft, [], rules) &&
                isShippingReady(draft),
        },
        {
            key: 'contact',
            // Owner Nov 3: Contact is a step for everyone; signed in, a summary card (Edit opens the form).
            // Supersedes "signed-in buyers skip Contact" (Nov 2) and the always-open prefilled form.
            show: () => true,
            ready: ({draft}) => isIntakeContactReady(draft),
        },
        {
            key: 'review',
            show: () => true,
            ready: () => false,
        },
    ],
};
