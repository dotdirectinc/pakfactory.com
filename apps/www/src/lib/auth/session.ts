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
 * The name to greet a signed-in buyer with.
 *
 * Supabase spreads whatever the provider sent into user_metadata, so the shape
 * differs per provider (Google sends full_name, others send name, email sign-ups
 * send neither). Reading it here keeps that guesswork out of the components.
 */
export function accountDisplayName(user: User): string {
    const metadata = user.user_metadata as {
        full_name?: unknown;
        name?: unknown;
    } | null;

    const fromMetadata = [metadata?.full_name, metadata?.name].find(
        (value): value is string =>
            typeof value === 'string' && value.trim().length > 0,
    );
    if (fromMetadata) return fromMetadata.trim();

    const localPart = user.email?.split('@')[0] ?? '';
    return localPart.replace(/[._-]+/g, ' ').trim();
}

/**
 * The provider's profile photo, when the session came with one.
 *
 * https only: user_metadata is provider-supplied and writable, so it must not be
 * able to feed a javascript: or data: URL into an img src.
 */
export function accountAvatarUrl(user: User): string | undefined {
    const metadata = user.user_metadata as {
        avatar_url?: unknown;
        picture?: unknown;
    } | null;

    return [metadata?.avatar_url, metadata?.picture].find(
        (value): value is string =>
            typeof value === 'string' && value.startsWith('https://'),
    );
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
