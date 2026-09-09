import type {ReactNode} from 'react';
import {headers} from 'next/headers';
import {PATHNAME_HEADER} from '@/proxy';
import {AccountShell} from '@/components/account/account-shell';
import {
    accountAvatarUrl,
    accountDisplayName,
    requireUser,
} from '@pakfactory/supabase/session';
import {WWW_ROUTES} from '@/lib/www-routes';

/**
 * Account chrome — no marketing site nav — AND the auth gate for every
 * /account/* route (PROD-1426).
 *
 * The gate lives here rather than in each page because a layout protects new
 * child routes by default: /account/profile and /account/requests cannot forget
 * to add the check, and neither can whatever is added next.
 *
 * Worth recording how this nearly went wrong. PROD-1426 originally gated
 * (site)/account/layout.tsx, while PROD-1841 moved the account pages to
 * (account)/ and deleted (site)/account/page.tsx. Git merged the two branches
 * with ZERO conflicts, leaving an orphaned layout guarding nothing and every
 * /account route served ungated. No conflict marker, no build error — the check
 * simply stopped applying.
 */
export default async function AccountRouteLayout({children}: {children: ReactNode}) {
    // Redirects to /login?next=… so signing in resumes here rather than dumping
    // the buyer on a landing page.
    // 🔴 The page that was asked for, not the account root.
    //
    // This hard-coded `WWW_ROUTES.account`, so a buyer following the receipt's
    // "Track your request" link with an expired session signed in and landed on
    // the account index — having to hunt for the request they had just clicked.
    // Set by the proxy (`PATHNAME_HEADER`), because a Server Component layout
    // cannot otherwise see the path. The account root is the fallback for a
    // request that bypassed the proxy, not a guess at the route.
    const requested = (await headers()).get(PATHNAME_HEADER) ?? WWW_ROUTES.account;
    const user = await requireUser(requested);

    return (
        <AccountShell
            displayName={accountDisplayName(user)}
            email={user.email ?? ''}
            avatarUrl={accountAvatarUrl(user)}
        >
            {children}
        </AccountShell>
    );
}
