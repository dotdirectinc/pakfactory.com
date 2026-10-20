import 'server-only';

import {createHash} from 'node:crypto';

/**
 * The visitor's Algolia userToken: a hash of their IP, never the IP itself.
 * Every Algolia call comes from our server's IP, so this is what makes a key's
 * per-IP cap count per visitor, and what ties a click event to its search
 * (PROD-3110 search, PROD-3111 clicks).
 */
export function searchUserToken(ip: string | null): string | undefined {
    if (!ip) return undefined;
    return createHash('sha256').update(ip).digest('hex').slice(0, 32);
}
