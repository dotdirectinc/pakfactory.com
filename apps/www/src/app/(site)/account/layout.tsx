import type {ReactNode} from 'react';
import {Button} from '@pakfactory/ui/components/button';
import {sendPasswordResetForCurrentUser, signOut} from '@/lib/auth/actions';
import {requireUser} from '@/lib/auth/session';

/**
 * Auth gate for /account/* (PROD-1426 step 4).
 *
 * A LAYOUT rather than edits to page.tsx: that page is the approved coming-soon
 * placeholder from the launch trunk, and PROD-1426 explicitly scopes out the
 * portal itself. Gating from the layout protects every future child route by
 * default — a new page under /account cannot forget to add the check.
 *
 * Gating lives here and not in the proxy on purpose. The proxy refreshes the
 * session for the whole site; deciding who may see what is a route concern, and
 * putting it in the redirect chain would mean every marketing request pays for a
 * check that only /account needs.
 */
export default async function AccountLayout({children}: {children: ReactNode}) {
    const user = await requireUser('/account');

    return (
        <>
            <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-4 py-4">
                <p className="text-muted-foreground text-sm">
                    Signed in as <span className="text-foreground">{user.email}</span>
                </p>
                {/* Forms, not links: both mutate state, and a GET that changes
                    state can be fired by a prefetch or a link scanner. */}
                <div className="flex items-center gap-2">
                    <form action={sendPasswordResetForCurrentUser}>
                        <Button type="submit" variant="ghost" size="sm">
                            Reset password
                        </Button>
                    </form>
                    <form action={signOut}>
                        <Button type="submit" variant="outline" size="sm">
                            Sign out
                        </Button>
                    </form>
                </div>
            </div>
            {children}
        </>
    );
}
