import type {CustomizationDetail} from '@/lib/catalog/types';

/**
 * PROD-3207 — visible "Also known as" list for the CDP.
 * Branch on `inheritAliasesFromConcept` only — never fall back when the chosen
 * list is empty (empty means no alias line).
 */
export function resolveOptionAliases(
    detail: Pick<
        CustomizationDetail,
        'alsoKnownAs' | 'conceptAliases' | 'inheritAliasesFromConcept'
    >,
): string[] {
    if (detail.inheritAliasesFromConcept) {
        return detail.conceptAliases ?? [];
    }
    return detail.alsoKnownAs ?? [];
}
