import 'server-only';

import {createClient, type SupabaseClient} from '@supabase/supabase-js';

import {createSearchGate} from './search-gate';

/**
 * The one gate instance per server process, wired to the site-wide budget in
 * Supabase (`public.site_search_budget_add`, pakfactory.com-backend migration
 * `site_search_budget`). Uses the public anon key: the RPC only accepts small
 * increments, see the migration for what that does and does not protect.
 *
 * Limits are env-tunable so a preview deployment can lower the budget to test
 * the 429 (QA checklist).
 */

const FLUSH_TIMEOUT_MS = 2000;
/** Same cap as the RPC's own check. */
const MAX_FLUSH_DELTA = 500;

function envInt(name: string, fallback: number): number {
    const value = Number.parseInt(process.env[name] ?? '', 10);
    return Number.isFinite(value) && value > 0 ? value : fallback;
}

let supabase: SupabaseClient | null | undefined;

function getSupabase(): SupabaseClient | null {
    if (supabase !== undefined) return supabase;
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
    supabase =
        url && anon
            ? createClient(url, anon, {auth: {persistSession: false, autoRefreshToken: false}})
            : null;
    return supabase;
}

/**
 * The database picks the hour (`date_trunc('hour', now())`), not the caller, so
 * nobody can write rows for other hours. Near the boundary a delta may land in
 * the next hour; the gate ignores totals for an hour it has already left.
 */
async function flushToSupabase(delta: number): Promise<number | null> {
    const db = getSupabase();
    if (!db) return null;
    const {data, error} = await db
        .rpc('site_search_budget_add', {p_delta: delta})
        .abortSignal(AbortSignal.timeout(FLUSH_TIMEOUT_MS));
    if (error || typeof data !== 'number') {
        console.warn('[search] budget flush failed:', error?.message ?? 'no total returned');
        return null;
    }
    return data;
}

export const searchGate = createSearchGate({
    perIpLimit: envInt('SITE_SEARCH_PER_IP_PER_MINUTE', 30),
    perIpWindowMs: 60 * 1000,
    instancePerMinute: envInt('SITE_SEARCH_INSTANCE_PER_MINUTE', 300),
    hourlyBudget: envInt('SITE_SEARCH_HOURLY_BUDGET', 3000),
    flushIntervalMs: 10 * 1000,
    maxFlushDelta: MAX_FLUSH_DELTA,
    flush: flushToSupabase,
});
