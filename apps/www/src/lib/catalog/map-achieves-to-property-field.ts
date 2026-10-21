import type {PropertyFieldDescriptor} from '@/lib/catalog/map-detail-to-property-fields';
import type {AchievedByOption} from '@/lib/catalog/types';

export const ACHIEVES_PROPERTY_KEY = 'achieves';

function pluralizeTypeTitle(label: string): string {
    const trimmed = label.trim();
    if (!trimmed) return 'options';
    if (/ies$/i.test(trimmed) || /ses$/i.test(trimmed)) return trimmed;
    if (/y$/i.test(trimmed) && !/[aeiou]y$/i.test(trimmed)) {
        return `${trimmed.slice(0, -1)}ies`;
    }
    if (/s$/i.test(trimmed) && !/ss$/i.test(trimmed)) return trimmed;
    if (
        /ch$/i.test(trimmed) ||
        /sh$/i.test(trimmed) ||
        /ss$/i.test(trimmed) ||
        /x$/i.test(trimmed)
    ) {
        return `${trimmed}es`;
    }
    return `${trimmed}s`;
}

export function achievesFieldLabel(targets: AchievedByOption[]): string {
    const titles = [
        ...new Set(
            targets
                .map((item) => item.typeTitle?.trim())
                .filter((title): title is string => Boolean(title)),
        ),
    ];
    if (titles.length === 1) {
        return `Achievable ${pluralizeTypeTitle(titles[0]!)}`;
    }
    return 'Achievable options';
}

/**
 * One radio group from forward `achieves[]`. Empty list → no field so the
 * configuration block hides (PROD-3128).
 */
export function mapAchievesToPropertyField(
    targets: AchievedByOption[] | undefined,
): PropertyFieldDescriptor | null {
    const options = (targets ?? []).filter(
        (item) => item.id.trim() && item.title.trim(),
    );
    if (options.length === 0) return null;
    return {
        propertyKey: ACHIEVES_PROPERTY_KEY,
        label: achievesFieldLabel(options),
        valuesPerItem: 'one',
        kind: 'radio',
        options: options.map((item) => ({
            id: item.id,
            title: item.title,
            ...(item.imageUrl ? {imageUrl: item.imageUrl} : {}),
        })),
    };
}
