/**
 * Sectioned request funnel events (R34): each section opening and completing is a
 * step, so the funnel stays comparable with the step intake. PORTABLE.
 */
import {trackFunnel} from '@/lib/request/funnel';
import type {RequestFlow} from '@/lib/intake/routes';
import type {SectionKey} from '@/lib/request-sections/flow';

export function trackSectionOpen(flow: RequestFlow, leadId: string, step: SectionKey) {
    trackFunnel('rfq_step_view', {flow, lead_id: leadId, step, layout: 'sections'});
}

export function trackSectionDone(flow: RequestFlow, leadId: string, step: SectionKey) {
    trackFunnel('rfq_section_done', {flow, lead_id: leadId, step, layout: 'sections'});
}

/** `/request` opened the request (step ① reached): new or resumed, and which kind. */
export function trackRequestOpen(flow: RequestFlow, leadId: string, items: number, resumed: boolean, from?: string) {
    trackFunnel('rfq_brief_open', {flow, entry_kind: flow === 'product' ? 'products' : 'express', lead_id: leadId, items, resumed, from: from ?? 'request'});
}
