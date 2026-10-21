import type {PropertyFieldDescriptor} from '@/lib/catalog/map-detail-to-property-fields';
import type {ConfigurationSource} from '@/lib/catalog/overview-chrome';

/**
 * Exactly one configuration source on the CDP rail (PROD-3128).
 */
export function resolveConfigurationFields(
    source: ConfigurationSource,
    propertyFields: PropertyFieldDescriptor[],
    achievesField: PropertyFieldDescriptor | null,
): PropertyFieldDescriptor[] {
    if (source === 'achieves') {
        return achievesField ? [achievesField] : [];
    }
    return propertyFields;
}
