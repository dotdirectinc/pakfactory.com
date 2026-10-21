import type {ConfigurationSource} from '@/lib/catalog/overview-chrome';
import type {AchievedByOption} from '@/lib/catalog/types';

export type WorksWithApplyOption = {
    category: string;
    slug: string;
};

/**
 * Which option (if any) Works with product links preselect on the PDP.
 * Knowledge rail (`showCta` off) never preselects. Achieves waits for a
 * selected customer-facing target (PROD-3127 / PROD-3128).
 */
export function resolveWorksWithApplyOption(args: {
    showCta: boolean;
    configurationSource: ConfigurationSource;
    pageOption: WorksWithApplyOption;
    achieves: AchievedByOption[] | undefined;
    selectedAchievesId: string | null;
}): WorksWithApplyOption | null {
    if (!args.showCta) return null;
    if (args.configurationSource === 'achieves') {
        const selected = args.achieves?.find(
            (item) => item.id === args.selectedAchievesId,
        );
        const category = selected?.categorySlug?.trim();
        const slug = selected?.slug?.trim();
        if (!category || !slug) return null;
        return {category, slug};
    }
    const category = args.pageOption.category.trim();
    const slug = args.pageOption.slug.trim();
    if (!category || !slug) return null;
    return {category, slug};
}

export function isAchievesApplyPending(args: {
    showCta: boolean;
    configurationSource: ConfigurationSource;
    applyOption: WorksWithApplyOption | null;
}): boolean {
    return (
        args.showCta &&
        args.configurationSource === 'achieves' &&
        args.applyOption == null
    );
}
