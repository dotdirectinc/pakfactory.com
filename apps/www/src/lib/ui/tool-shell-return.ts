/**
 * Close on chrome-less tool shells (`(request)` / `(compare)`): prefer
 * history.back() so the origin page keeps scroll context where possible, fall
 * back to the last remembered site href. SoftPageTransition plays page-enter
 * on return (same family as other site navigations). See DESIGN.md § Motion.
 */

import {WWW_ROUTES} from '@/lib/www-routes';

const RETURN_KEY = 'pf_tool_shell_return';

type ShellRouter = {
    back: () => void;
    push: (href: string) => void;
};

/** True for `/request` and `/compare` route groups (tool shells, not site pages). */
export function isToolShellPath(pathname: string): boolean {
    return pathname.startsWith('/request') || pathname.startsWith('/compare');
}

/** Last site page outside tool shells (set while browsing the site). */
export function rememberToolShellReturn(href: string): void {
    if (typeof window === 'undefined') return;
    try {
        window.sessionStorage.setItem(RETURN_KEY, href);
    } catch {
        /* storage blocked */
    }
}

export function toolShellReturnHref(): string | null {
    if (typeof window === 'undefined') return null;
    try {
        return window.sessionStorage.getItem(RETURN_KEY);
    } catch {
        return null;
    }
}

type LeaveOpts = {
    /** Used when history cannot go back and no return href is stored. */
    fallback?: string;
};

/** Dismiss a tool shell: keep origin scroll via back(), else push remembered href. */
export function leaveToolShell(router: ShellRouter, opts: LeaveOpts = {}): void {
    const fallback = opts.fallback ?? WWW_ROUTES.home;
    const back = toolShellReturnHref();
    if (back && typeof window !== 'undefined' && window.history.length > 1) {
        router.back();
        return;
    }
    router.push(back ?? fallback);
}
