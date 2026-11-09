import {LEGACY_SERVICE_LABELS, REQUEST_COPY} from '@/lib/copy/request';

const SERVICE_OTHER_LABEL = REQUEST_COPY.serviceOtherLabel;
import type {RequestServiceOption} from '@/lib/request/service-option';

/** "Something else" on the step intake (Nov 2): the buyer's own words live in draft.serviceOther. */
export const OTHER_SERVICE_ID = 'other';

/** Display label for a stored service id (stage slug or legacy coarse id). */
export function resolveServiceLabel(
    id: string,
    options: RequestServiceOption[] = [],
    otherText?: string,
): string {
    if (id === OTHER_SERVICE_ID) {
        const text = otherText?.trim();
        return text ? `${SERVICE_OTHER_LABEL}: ${text}` : SERVICE_OTHER_LABEL;
    }
    const fromOptions = options.find((option) => option.id === id)?.label;
    if (fromOptions) return fromOptions;
    return LEGACY_SERVICE_LABELS[id] ?? id;
}

/** Title map for selected service ids — same order as `services`. */
export function serviceTitlesForIds(
    ids: string[],
    options: RequestServiceOption[] = [],
    otherText?: string,
): string[] {
    return ids.map((id) => resolveServiceLabel(id, options, otherText));
}
