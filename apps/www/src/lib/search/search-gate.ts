/**
 * Abuse gate for `/api/search` (PROD-3110). Every request that reaches the
 * function is about to cost one Algolia query (CDN hits never get here), so
 * three limits sit in front of it:
 *
 * 1. Per visitor IP, per server instance — a sliding window.
 * 2. Per server instance — a cap per minute, so a burst spread over many IPs is
 *    bounded even when Supabase is down.
 * 3. Site-wide, per clock hour — a budget shared by every instance. Each
 *    instance tallies in memory and flushes the delta to Supabase at most every
 *    `flushIntervalMs` (no database write per search). The flush returns the
 *    hour's total across all instances, which is what the next checks compare
 *    against. If the flush fails, limits 1 and 2 keep working on their own.
 *
 * The Vercel Firewall rule (20 req / 10 s per IP → 3 min block) runs before any
 * of this, at the edge — see `apps/www/docs/site-search.md`.
 *
 * Pure apart from the injected `flush`, so it is unit-tested with a fake clock.
 */

export type GateDecision =
    | {allowed: true}
    | {allowed: false; reason: 'ip' | 'instance' | 'budget'; retryAfterSec: number};

export type SearchGateOptions = {
    perIpLimit: number;
    perIpWindowMs: number;
    instancePerMinute: number;
    hourlyBudget: number;
    flushIntervalMs: number;
    /** Largest delta sent per flush; the rest waits for the next one (RPC cap). */
    maxFlushDelta: number;
    /**
     * Adds `delta` to the site-wide counter for `hourStartMs`, returns the
     * hour's new total, or null when the store is unreachable.
     */
    flush: (delta: number, hourStartMs: number) => Promise<number | null>;
    now?: () => number;
};

const HOUR_MS = 60 * 60 * 1000;
const MINUTE_MS = 60 * 1000;
/** Bound memory if an attacker rotates IPs: prune when the map grows past this. */
const MAX_TRACKED_IPS = 5000;

export function createSearchGate(options: SearchGateOptions) {
    const now = options.now ?? Date.now;
    const perIp = new Map<string, number[]>();
    let instanceWindow: number[] = [];

    let hourStart = Math.floor(now() / HOUR_MS) * HOUR_MS;
    /** Site-wide total for `hourStart` as of the last successful flush. */
    let knownTotal = 0;
    /** Allowed here but not yet sent to the store. */
    let pending = 0;
    let lastFlushAt = now();
    let inFlight: Promise<void> | null = null;

    function rollHour(t: number) {
        const current = Math.floor(t / HOUR_MS) * HOUR_MS;
        if (current !== hourStart) {
            hourStart = current;
            knownTotal = 0;
            // Pending from the old hour is dropped: that budget window is over.
            pending = 0;
        }
    }

    function pruneIps(t: number) {
        if (perIp.size <= MAX_TRACKED_IPS) return;
        for (const [ip, stamps] of perIp) {
            if (!stamps.length || t - stamps[stamps.length - 1]! >= options.perIpWindowMs) {
                perIp.delete(ip);
            }
        }
    }

    /** Checks all three limits; when allowed, counts the request. */
    function check(ip: string | null): GateDecision {
        const t = now();
        rollHour(t);

        if (knownTotal + pending >= options.hourlyBudget) {
            return {
                allowed: false,
                reason: 'budget',
                retryAfterSec: Math.max(1, Math.ceil((hourStart + HOUR_MS - t) / 1000)),
            };
        }

        instanceWindow = instanceWindow.filter((s) => t - s < MINUTE_MS);
        if (instanceWindow.length >= options.instancePerMinute) {
            return {
                allowed: false,
                reason: 'instance',
                retryAfterSec: Math.max(1, Math.ceil((instanceWindow[0]! + MINUTE_MS - t) / 1000)),
            };
        }

        const key = ip || 'unknown';
        const stamps = (perIp.get(key) ?? []).filter((s) => t - s < options.perIpWindowMs);
        if (stamps.length >= options.perIpLimit) {
            perIp.set(key, stamps);
            return {
                allowed: false,
                reason: 'ip',
                retryAfterSec: Math.max(
                    1,
                    Math.ceil((stamps[0]! + options.perIpWindowMs - t) / 1000),
                ),
            };
        }

        stamps.push(t);
        perIp.set(key, stamps);
        pruneIps(t);
        instanceWindow.push(t);
        pending += 1;
        return {allowed: true};
    }

    /** Sends the pending delta when the interval has passed. Never throws. */
    async function flushIfDue(): Promise<void> {
        const t = now();
        rollHour(t);
        if (inFlight || pending === 0 || t - lastFlushAt < options.flushIntervalMs) {
            return inFlight ?? undefined;
        }
        const delta = Math.min(pending, options.maxFlushDelta);
        const forHour = hourStart;
        pending -= delta;
        lastFlushAt = t;
        inFlight = (async () => {
            let total: number | null = null;
            try {
                total = await options.flush(delta, forHour);
            } catch {
                total = null;
            }
            if (forHour !== hourStart) return; // the hour rolled while flushing
            if (total === null) {
                // Store unreachable: keep the delta for the next attempt.
                pending += delta;
            } else {
                knownTotal = total;
            }
        })().finally(() => {
            inFlight = null;
        });
        return inFlight;
    }

    return {
        check,
        flushIfDue,
        /** For tests and logs. */
        snapshot: () => ({hourStart, knownTotal, pending, trackedIps: perIp.size}),
    };
}

export type SearchGate = ReturnType<typeof createSearchGate>;
