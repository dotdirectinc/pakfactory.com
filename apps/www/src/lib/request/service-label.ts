import {LEGACY_SERVICE_LABELS} from '@/lib/copy/request';
import type {RequestServiceOption} from '@/lib/request/service-option';

/** Display label for a stored service id (stage slug or legacy coarse id). */
export function resolveServiceLabel(
    id: string,
    options: RequestServiceOption[] = [],
): string {
    const fromOptions = options.find((option) => option.id === id)?.label;
    if (fromOptions) return fromOptions;
    return LEGACY_SERVICE_LABELS[id] ?? id;
}

/** Title map for selected service ids — same order as `services`. */
export function serviceTitlesForIds(
    ids: string[],
    options: RequestServiceOption[] = [],
): string[] {
    return ids.map((id) => resolveServiceLabel(id, options));
}
