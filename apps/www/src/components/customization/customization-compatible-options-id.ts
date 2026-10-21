import type {CustomizationDetail} from '@/lib/catalog/types';

export const CUSTOMIZATION_COMPATIBLE_OPTIONS_ID =
    'customization-compatible-options';

/** True when the band has at least one card (nav + render stay in sync). */
export function hasCompatibleOptions(
    detail: Pick<CustomizationDetail, 'compatibleOptions'>,
): boolean {
    return (detail.compatibleOptions?.length ?? 0) > 0;
}
