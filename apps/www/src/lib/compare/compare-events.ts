/**
 * Compare measures (Website PRD R47): compare_add, compare_view, compare_action,
 * compare_to_request — into the same analytics pipe as the request funnel (R34).
 */
import {captureEvent} from '@/lib/analytics';

export type CompareEvent = 'compare_add' | 'compare_view' | 'compare_action' | 'compare_to_request';

export function trackCompare(event: CompareEvent, props: Record<string, unknown>): void {
    captureEvent(event, props);
}
