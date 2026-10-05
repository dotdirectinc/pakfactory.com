'use client';

import {useEffect, useState} from 'react';
import type {User} from '@supabase/supabase-js';
import {
    accountAvatarUrl,
    accountDisplayName,
} from '@pakfactory/supabase/account-display';
import {createClient} from '@pakfactory/supabase/client';

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

        // The header must never take the page down: a missing or misconfigured
        // Supabase env throws here, and that degrades to signed-out (as the old
        // server-side try/catch did) instead of crashing the route.
        let supabase: ReturnType<typeof createClient>;
        try {
            supabase = createClient();
        } catch {
            apply(null);
            return;
        }

        supabase.auth
            .getSession()
            .then(({data}) => apply(data.session?.user))
            .catch(() => apply(null));
        const {data} = supabase.auth.onAuthStateChange((_event, session) =>
            apply(session?.user),
        );

        return () => {
            active = false;
            data.subscription.unsubscribe();
        };
    }, []);

    return state;
}
