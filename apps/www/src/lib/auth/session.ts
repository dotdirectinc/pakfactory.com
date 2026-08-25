import {redirect} from 'next/navigation';
import type {User} from '@supabase/supabase-js';
import {createClient} from '../supabase/server';

/**
 * Session helpers for route gating (PROD-1426 step 4).
 *
 * getUser(), never getSession(): getSession trusts the cookie as it arrives,
 * getUser revalidates it against the auth server. A gate that trusts an
 * unverified cookie is not a gate.
 */
export async function getUser(): Promise<User | null> {
    const supabase = await createClient();
    const {
        data: {user},
    } = await supabase.auth.getUser();
    return user;
}

/**
 * Gate a protected route. Sends unauthenticated visitors to /login carrying
 * where they were headed, so signing in resumes the journey instead of dumping
 * them on a landing page.
 */
export async function requireUser(returnTo: string): Promise<User> {
    const user = await getUser();
    if (!user) {
        redirect(`/login?next=${encodeURIComponent(returnTo)}`);
    }
    return user;
}

/**
 * A relative, single-slash path or nothing.
 *
 * `next` arrives from a query string, so it is attacker-controlled: an unchecked
 * value lets a crafted /login?next=https://evil.example bounce a buyer to another
 * site at the exact moment they have just authenticated and are least suspicious.
 * `//evil.example` is rejected too — browsers read it as protocol-relative.
 */
export function safeNext(value: string | undefined, fallback = '/account'): string {
    if (!value) return fallback;
    return value.startsWith('/') && !value.startsWith('//') ? value : fallback;
}
