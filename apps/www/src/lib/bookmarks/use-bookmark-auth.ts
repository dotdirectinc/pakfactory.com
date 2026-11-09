'use client';

import {useNavAccount} from '@/lib/auth/use-nav-account';
import {WWW_ROUTES} from '@/lib/www-routes';

/**
 * Bookmarks require a signed-in session. Guests are
 * sent to login / sign-up; storage stays in the browser after they sign in.
 */
export function useBookmarkAuth(): {
    canBookmark: boolean;
    pending: boolean;
    loginHref: (returnPath: string) => string;
    signUpHref: (returnPath: string) => string;
} {
    const session = useNavAccount();
    const canBookmark = session.status === 'signed-in';
    const pending = session.status === 'pending';

    return {
        canBookmark,
        pending,
        loginHref: (returnPath: string) =>
            `${WWW_ROUTES.login}?next=${encodeURIComponent(returnPath || '/')}`,
        signUpHref: (returnPath: string) =>
            `${WWW_ROUTES.signUp}?next=${encodeURIComponent(returnPath || '/')}`,
    };
}
