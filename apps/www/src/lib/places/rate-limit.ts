const SESSION_TTL_MS = 10 * 60 * 1000;
const MAX_AUTOCOMPLETE_PER_SESSION = 20;
const AUTOCOMPLETE_IP_LIMIT = 60;
const DETAILS_IP_LIMIT = 20;
const IP_WINDOW_MS = 60 * 1000;

type SessionEntry = {
    count: number;
    expiresAt: number;
};

type WindowEntry = {
    timestamps: number[];
};

const sessionCaps = new Map<string, SessionEntry>();
const ipAutocomplete = new Map<string, WindowEntry>();
const ipDetails = new Map<string, WindowEntry>();

function pruneExpiredSessions(now: number) {
    for (const [key, entry] of sessionCaps) {
        if (entry.expiresAt <= now) sessionCaps.delete(key);
    }
}

function takeWindowSlot(
    store: Map<string, WindowEntry>,
    key: string,
    limit: number,
    now: number,
): boolean {
    const entry = store.get(key) ?? {timestamps: []};
    const fresh = entry.timestamps.filter((t) => now - t < IP_WINDOW_MS);
    if (fresh.length >= limit) {
        store.set(key, {timestamps: fresh});
        return false;
    }
    fresh.push(now);
    store.set(key, {timestamps: fresh});
    return true;
}

/** Best-effort in-memory limits (per process). Returns false when blocked. */
export function allowAutocomplete(sessionToken: string, ip: string): boolean {
    const now = Date.now();
    pruneExpiredSessions(now);

    const session = sessionCaps.get(sessionToken);
    if (session && session.expiresAt > now) {
        if (session.count >= MAX_AUTOCOMPLETE_PER_SESSION) return false;
        session.count += 1;
        sessionCaps.set(sessionToken, session);
    } else {
        sessionCaps.set(sessionToken, {
            count: 1,
            expiresAt: now + SESSION_TTL_MS,
        });
    }

    return takeWindowSlot(
        ipAutocomplete,
        ip || 'unknown',
        AUTOCOMPLETE_IP_LIMIT,
        now,
    );
}

export function allowDetails(ip: string): boolean {
    const now = Date.now();
    return takeWindowSlot(ipDetails, ip || 'unknown', DETAILS_IP_LIMIT, now);
}
