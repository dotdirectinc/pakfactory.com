import type {RequestDraft} from '@/lib/request/request.storage';

/**
 * What the buyer needs a quote for (R36, owner Nov 3): a LIST of option ids, so a new kind of
 * item we quote is one more option (REQUEST_COPY.intakeNeedChoices) plus its follow-up questions
 * on Project details — no new "both" values. Today: 'packaging', 'service'.
 *
 * `draft.need` ('packaging' | 'service' | 'both') is kept in step for the one-page form and older
 * drafts; read through draftNeeds(), write through needsPatch().
 */
export const NEED_PACKAGING = 'packaging';
export const NEED_SERVICE = 'service';

export function draftNeeds(draft: Pick<RequestDraft, 'need' | 'needs'>): string[] {
    if (Array.isArray(draft.needs)) return draft.needs;
    if (draft.need === 'both') return [NEED_PACKAGING, NEED_SERVICE];
    // Absent = packaging (today's behaviour before R36).
    return [draft.need ?? NEED_PACKAGING];
}

export function hasNeed(draft: Pick<RequestDraft, 'need' | 'needs'>, id: string): boolean {
    return draftNeeds(draft).includes(id);
}

/** The legacy single value for the options that existed before the list. */
function legacyNeed(needs: string[]): RequestDraft['need'] {
    const p = needs.includes(NEED_PACKAGING);
    const s = needs.includes(NEED_SERVICE);
    if (p && s) return 'both';
    if (s) return 'service';
    if (p) return 'packaging';
    return undefined;
}

export function needsPatch(needs: string[]): Pick<RequestDraft, 'needs' | 'need'> {
    const need = legacyNeed(needs);
    return {needs, ...(need ? {need} : {})};
}
