'use client';

import {useEffect, useState} from 'react';
import type {User} from '@supabase/supabase-js';
import {
    accountAvatarUrl,
    accountDisplayName,
} from '@pakfactory/supabase/account-display';

import {hasAuthCookie} from '@/lib/auth/nav-session-flag';

/**
 * Header account state resolved in the browser (PROD-2754).
 *
 * The `(site)` layout no longer reads the session on the server: that read
 * (cookies + getUser) made every marketing page dynamic, so none of them could
 * be served from the CDN. The server now renders the signed-out header for
 * everyone, and the header fills in the account here after hydration.
 *
 * Display only: this uses the session cookie as-is (getSession). Anything that
 * authorizes — account pages, request submission — still checks getUser() on
 * the server.
 *
 * The Supabase client (~60 KB gzipped) is imported only when an auth cookie is
 * present: without one the visitor is signed out, and anonymous visitors — most
 * of the traffic — skip the download entirely. Signing in happens on the
 * `(auth)` routes, so returning to a `(site)` page remounts this hook with the
 * new cookie.
 */

export type NavAccount = {
    displayName: string;
    email: string;
    avatarUrl?: string;
};

export type NavAccountState =
    | {status: 'pending'}
    | {status: 'signed-out'}
    | {status: 'signed-in'; account: NavAccount};

function toNavAccount(user: User): NavAccount {
    return {
        displayName: accountDisplayName(user),
        email: user.email ?? '',
        avatarUrl: accountAvatarUrl(user),
    };
}

export function useNavAccount(): NavAccountState {
    const [state, setState] = useState<NavAccountState>({status: 'pending'});

    useEffect(() => {
        let active = true;
        const apply = (user: User | null | undefined) => {
            if (!active) return;
            setState(
                user
                    ? {status: 'signed-in', account: toNavAccount(user)}
                    : {status: 'signed-out'},
            );
        };

        if (!hasAuthCookie()) {
            apply(null);
            return;
        }

        let unsubscribe: (() => void) | undefined;
        // The header must never take the page down: a failed chunk load or a
        // missing / misconfigured Supabase env degrades to signed-out (as the old
        // server-side try/catch did) instead of crashing the route.
        import('@pakfactory/supabase/client')
            .then(({createClient}) => {
                if (!active) return;
                const supabase = createClient();
                const {data} = supabase.auth.onAuthStateChange(
                    (_event, session) => apply(session?.user),
                );
                unsubscribe = () => data.subscription.unsubscribe();
                return supabase.auth
                    .getSession()
                    .then(({data: session}) => apply(session.session?.user));
            })
            .catch(() => apply(null));

        return () => {
            active = false;
            unsubscribe?.();
        };
    }, []);

    return state;
}
