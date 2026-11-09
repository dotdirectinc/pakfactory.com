import {captureEvent} from '@/lib/analytics';

/**
 * Request funnel measures (c59, Unreleased · POC): one event per step so
 * drop-off can be read per step and per entry. Fired into GTM's dataLayer.
 *
 *   rfq_brief_open   {entry_kind, from}
 *   rfq_step_view    {entry_kind, step}       first time each step is reached
 *                    + {flow, lead_id, shell} on the step intakes (R40: same URLs and
 *                    step names for every shell, so shells compare like for like)
 *   rfq_need_selected {flow, lead_id, needs, set_by: 'buyer' | 'door'}  first tick on Project
 *                    details' choice, or the door setting it (Website PRD v4.7, R34)
 *   rfq_section_done {flow, lead_id, step, layout: 'sections'}  RFQ v2: a section completed
 *   rfq_submit_click {entry_kind}
 *   rfq_submitted    {entry_kind, ref} (+ flow, lead_id, shell)
 */
export type FunnelEvent = 'rfq_brief_open' | 'rfq_step_view' | 'rfq_section_done' | 'rfq_need_selected' | 'rfq_submit_click' | 'rfq_submitted';

export function trackFunnel(event: FunnelEvent, props: Record<string, unknown>): void {
    captureEvent(event, props);
}

/** `from` on the current URL (set by R29 request doors), for rfq_brief_open. */
export function entryFrom(): string | undefined {
    if (typeof window === 'undefined') return undefined;
    return new URLSearchParams(window.location.search).get('from') ?? undefined;
}
