'use server';

import {getCustomizationOption} from '@/lib/catalog/catalog';
import {
    mapDetailToPropertyFields,
    type PropertyFieldDescriptor,
} from '@/lib/catalog/map-detail-to-property-fields';

/**
 * Load selectable Property field descriptors for a builder Option (Sanity only).
 */
export async function loadOptionPropertyFields(
    optionId: string,
): Promise<PropertyFieldDescriptor[]> {
    const detail = await getCustomizationOption(optionId);
    if (!detail) return [];
    return mapDetailToPropertyFields(detail);
}
