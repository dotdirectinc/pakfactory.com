import type {RequestDraft} from '@/lib/request/request.storage';
import {OTHER_SERVICE_ID} from '@/lib/request/service-label';

/** The Services step (product and service requests): at least one service; Something else needs words. */
export function isServicesStepReady(draft: RequestDraft): boolean {
    return draft.services.length > 0 && (!draft.services.includes(OTHER_SERVICE_ID) || Boolean(draft.serviceOther?.trim()));
}
