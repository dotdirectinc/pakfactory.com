import type {ReactNode} from 'react';
import {accountIdentity, type AccountIdentity} from '@pakfactory/supabase/session';
import {createClient} from '@pakfactory/supabase/server';
import {RequestRoot} from '@/lib/request/request-root';

/**
 * Isolated wizard chrome — no site nav (POC BriefBuilder / Request Builder).
 *
 * Reads the viewer HERE, on the server, rather than from a client hook. The
 * draft lives in localStorage and renders immediately, so a client-side fetch
 * would paint empty contact fields first and then fill them — the buyer sees
 * their own name appear a beat late, or starts typing into a field that is
 * about to be overwritten. Resolving it before the tree renders removes the
 * race entirely.
 *
 * Failure is not fatal: an anonymous visitor and a Supabase blip both mean "no
 * prefill", and the form is fully usable either way.
 */
export default async function RequestLayout({children}: {children: ReactNode}) {
    let viewer: AccountIdentity | null = null;
    try {
        const supabase = await createClient();
        const {data} = await supabase.auth.getUser();
        viewer = data.user ? accountIdentity(data.user) : null;
    } catch {
        viewer = null;
    }

    return <RequestRoot viewer={viewer}>{children}</RequestRoot>;
}
