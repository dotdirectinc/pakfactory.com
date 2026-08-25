import {NextResponse} from 'next/server';
import {createClient} from '@/lib/supabase/server';

/**
 * Exchange a link-style auth `?code=` for a session.
 *
 * The chosen flow is OTP — the buyer types a code and never receives a link — so
 * this is NOT the primary path. It exists because Supabase's DEFAULT templates
 * are link-based, and any email already sent (or sent after someone reverts a
 * template) lands the buyer on a URL carrying `?code=<uuid>`. Without a handler
 * that URL resolves to whatever page happens to match — the home page, silently,
 * with no session and no explanation.
 *
 * Also the landing point if OAuth or a magic link is ever added, both of which
 * use this same exchange.
 */
export async function GET(request: Request) {
    const {searchParams, origin} = new URL(request.url);
    const code = searchParams.get('code');
    // `next` is validated as a relative path: an open redirect here would let a
    // crafted link bounce a freshly-authenticated buyer to another site.
    const requested = searchParams.get('next') ?? '/account';
    const next = requested.startsWith('/') && !requested.startsWith('//') ? requested : '/account';

    if (!code) {
        return NextResponse.redirect(`${origin}/login?error=link_invalid`);
    }

    const supabase = await createClient();
    const {error} = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
        // Single-use and time-limited, so the common cause is a link that was
        // already opened — including by a mail scanner before the buyer clicked.
        return NextResponse.redirect(`${origin}/login?error=link_expired`);
    }

    return NextResponse.redirect(`${origin}${next}`);
}
