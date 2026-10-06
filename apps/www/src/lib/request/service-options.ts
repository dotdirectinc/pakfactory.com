import 'server-only';

import {listExpertiseStageCards} from '@/lib/expertise/expertise';
import type {RequestServiceOption} from '@/lib/request/service-option';

/**
 * Brief Builder service checkboxes — active expertise stages in hub featured
 * order. Ids are stage slugs (stored on `draft.services`).
 */
export async function listRequestServiceOptions(): Promise<
    RequestServiceOption[]
> {
    const stages = await listExpertiseStageCards();
    return stages
        .filter((stage) => stage.slug.trim().length > 0)
        .map((stage) => {
            const description = stage.description?.trim();
            return {
                id: stage.slug,
                label: stage.title,
                ...(description ? {description} : {}),
            };
        });
}
