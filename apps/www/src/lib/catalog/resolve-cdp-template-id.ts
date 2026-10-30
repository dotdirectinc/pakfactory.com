/**
 * Which Customization Detail Page layout id to use when an option has no
 * explicit `template` ref (PROD-3127 / PROD-3128).
 *
 * Explicit Studio picks always win — this helper only covers the empty case.
 */

export const CDP_TEMPLATE_DEFAULT = 'customizationDetailPage';
export const CDP_TEMPLATE_KNOWLEDGE = 'customizationDetailPageKnowledge';
export const CDP_TEMPLATE_ACHIEVES = 'customizationDetailPageAchieves';

export type ResolveCdpTemplateIdInput = {
    /** Published template document id when the option picks one. */
    templateId?: string | null;
    appearsIn?: string | null;
    /** Forward `achieves[]` length (or any positive signal). */
    achievesCount?: number;
};

/**
 * Prefer explicit `templateId`. Else Not Configurable + Achieves → Achieves
 * layout; Not Configurable alone → Knowledge; everything else → Default.
 */
export function resolveCdpTemplateId(
    input: ResolveCdpTemplateIdInput,
): string {
    const explicit = input.templateId?.trim();
    if (explicit) return explicit;

    if (input.appearsIn === 'not-configurable-with-page') {
        if ((input.achievesCount ?? 0) > 0) return CDP_TEMPLATE_ACHIEVES;
        return CDP_TEMPLATE_KNOWLEDGE;
    }

    return CDP_TEMPLATE_DEFAULT;
}
