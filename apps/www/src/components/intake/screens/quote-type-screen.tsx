'use client';

import {CheckboxCards} from '@/components/intake/fields/choice-cards';
import {REQUEST_COPY} from '@/lib/copy/request';
import {draftNeeds, NEED_SERVICE, needsPatch} from '@/lib/intake/needs';
import type {RequestDraft} from '@/lib/request/request.storage';
import {trackFunnel} from '@/lib/request/funnel';

/**
 * What you need (owner Nov 2–3; Website PRD R36 on the step intake). v4.7 (owner Nov 6): no longer
 * its own step — Project details opens with it (ProjectDetailsScreen). Tick what the buyer wants
 * quoted. The options are a list (REQUEST_COPY.intakeNeedChoices) so a new kind of item is one
 * more entry; the answer is stored as a list too (draft.needs). Follow-up questions are on
 * Project details. Nothing is ticked until the buyer ticks in this visit (an older draft may
 * carry a default).
 */
export function QuoteTypeScreen({draft, onPatch, showLabel = false}: {draft: RequestDraft; onPatch: (patch: Partial<RequestDraft>) => void; showLabel?: boolean}) {
    const values = draft.needPicked ? draftNeeds(draft) : [];
    return (
        <CheckboxCards
            id="intake-need"
            label={REQUEST_COPY.intakeNeedLabel}
            hideLabel={!showLabel}
            options={REQUEST_COPY.intakeNeedChoices}
            values={values}
            onChange={(next) => {
                if (!next.length) {
                    // Nothing ticked: Continue stays off until one is.
                    onPatch({needPicked: false});
                    return;
                }
                // Keep the screen's order whatever order they were ticked in.
                const ordered = REQUEST_COPY.intakeNeedChoices.map((o) => o.value).filter((v) => next.includes(v));
                const wantsService = ordered.includes(NEED_SERVICE);
                if (!draft.needPicked) trackFunnel('rfq_need_selected', {flow: 'general', lead_id: draft.id, needs: ordered, set_by: 'buyer'});
                onPatch({
                    ...needsPatch(ordered),
                    needPicked: true,
                    servicesEnabled: wantsService,
                    // Answers under an unticked option are kept (ticking it again restores them),
                    // except services, which a request without services must not send.
                    ...(wantsService ? {} : {services: [], serviceOther: ''}),
                });
            }}
        />
    );
}
