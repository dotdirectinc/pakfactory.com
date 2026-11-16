'use client';

import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {usePathname} from 'next/navigation';
import {MessageCircle, X} from 'lucide-react';
import {useChatSettings} from '@/components/chat/chat-settings';
import {useChatContext} from '@/lib/chat/chat-context';
import {OPEN_CHAT_EVENT} from '@/lib/chat/open-chat';
import {createIntercomProvider} from '@/lib/chat/intercom';
import {allowsIdlePrompt, chatPageType} from '@/lib/chat/page-type';
import {useIdle} from '@/lib/chat/use-idle';
import type {ChatProvider} from '@/lib/chat/chat-provider';

export {OPEN_CHAT_EVENT, openChat} from '@/lib/chat/open-chat';

/** No input for this long → send the chat an `idle` event (Intercom shows the page's prompt). */
const IDLE_PROMPT_MS = 45_000;
/** At most one idle prompt per browser session. */
const IDLE_PROMPTED_KEY = 'pf_chat_idle_prompted';
/**
 * Defer Intercom's ~220 KB of script until well after first paint. Booting on
 * mount competed with LCP on every measured page (local baseline 2026-11-13).
 * `requestIdleCallback` alone can fire within a few hundred ms once the main
 * thread is quiet — keep a hard floor so LCP is not sharing the connection.
 */
const INTERCOM_BOOT_DELAY_MS = 8_000;

function idlePromptedThisSession(): boolean {
    try {
        return window.sessionStorage.getItem(IDLE_PROMPTED_KEY) === '1';
    } catch {
        return false;
    }
}

function markIdlePrompted(): void {
    try {
        window.sessionStorage.setItem(IDLE_PROMPTED_KEY, '1');
    } catch {
        // Storage blocked: the prompt may show again next page. Acceptable.
    }
}

/**
 * Site chat button (bottom-right). Launch: opens the Intercom Messenger (Global Settings →
 * Integrations → Show Intercom chat + App ID). Later the AI Sidekick replaces the provider,
 * not this button. Sits above the round compare button and lifts above the open compare bar
 * (reads `--compare-fab-stack` / `--compare-drawer-lift` from compare-bar.tsx).
 * On /request, `--chat-fab-offset` lifts it above the sticky submit strip.
 * Also sends the page type on every navigation and an `idle` event after IDLE_PROMPT_MS without
 * input (lib/chat/use-idle), so the chat can ask a page-specific question.
 */
export function ChatFab() {
    const {intercomEnabled, intercomAppId} = useChatSettings();
    const appId = intercomEnabled ? intercomAppId?.trim() || null : null;
    const provider = useMemo<ChatProvider | null>(() => (appId ? createIntercomProvider(appId) : null), [appId]);
    const context = useChatContext();
    const pathname = usePathname();
    const pageType = chatPageType(pathname, context);
    const [open, setOpen] = useState(false);
    const [unread, setUnread] = useState(0);
    const [booted, setBooted] = useState(false);
    const bootedRef = useRef(false);

    const ensureStarted = useCallback(() => {
        if (!provider || bootedRef.current) return;
        bootedRef.current = true;
        provider.start();
        provider.onUnreadCount(setUnread);
        provider.onOpenChange(setOpen);
        setBooted(true);
    }, [provider]);

    // Warm Intercom after a hard delay past load — never on the critical path.
    // FAB click / openChat / idle prompt still call ensureStarted() immediately.
    useEffect(() => {
        if (!provider) return;
        let idleId: number | undefined;
        let delayId: ReturnType<typeof setTimeout> | undefined;
        let cancelled = false;

        const boot = () => {
            if (!cancelled) ensureStarted();
        };

        const afterDelay = () => {
            if (typeof window.requestIdleCallback === 'function') {
                idleId = window.requestIdleCallback(boot, {timeout: 2_000});
            } else {
                boot();
            }
        };

        const schedule = () => {
            delayId = setTimeout(afterDelay, INTERCOM_BOOT_DELAY_MS);
        };

        if (document.readyState === 'complete') {
            schedule();
        } else {
            window.addEventListener('load', schedule, {once: true});
        }

        return () => {
            cancelled = true;
            window.removeEventListener('load', schedule);
            if (idleId !== undefined && typeof window.cancelIdleCallback === 'function') {
                window.cancelIdleCallback(idleId);
            }
            if (delayId !== undefined) clearTimeout(delayId);
            if (bootedRef.current) {
                provider.shutdown();
                bootedRef.current = false;
            }
        };
    }, [provider, ensureStarted]);

    // CMP-16: on /compare the team sees what the buyer is comparing.
    useEffect(() => {
        if (!booted) return;
        provider?.setContext(context);
    }, [provider, context, booted]);

    // Client-side navigation: tell the chat the new page (Intercom re-checks page-URL rules).
    useEffect(() => {
        if (!booted) return;
        provider?.setPage(pageType);
    }, [provider, pathname, pageType, booted]);

    // Idle prompt: once per session, never while the chat is open or on forms / account pages.
    const onIdle = useCallback(() => {
        if (!provider || idlePromptedThisSession()) return;
        ensureStarted();
        markIdlePrompted();
        const metadata: Record<string, string> = {page_type: pageType};
        if (context?.kind === 'product') metadata.product = context.name;
        provider.trackEvent('idle', metadata);
    }, [provider, pageType, context, ensureStarted]);
    useIdle(
        IDLE_PROMPT_MS,
        Boolean(provider) && !open && allowsIdlePrompt(pageType),
        onIdle,
        pathname ?? undefined,
    );

    useEffect(() => {
        if (!provider) return;
        const onOpen = () => {
            ensureStarted();
            provider.open();
        };
        window.addEventListener(OPEN_CHAT_EVENT, onOpen);
        return () => window.removeEventListener(OPEN_CHAT_EVENT, onOpen);
    }, [provider, ensureStarted]);

    if (!provider) return null;

    return (
        <div
            className="fixed right-5 z-[60] transition-[bottom] duration-[var(--motion-slow)] ease-out motion-reduce:transition-none"
            style={{
                bottom: 'calc(var(--chat-fab-offset, 1.25rem) + var(--compare-fab-stack, 0px) + var(--compare-drawer-lift, 0px))',
            }}
        >
            <button
                type="button"
                onClick={() => {
                    ensureStarted();
                    if (open) provider.close();
                    else provider.open();
                }}
                aria-label={open ? 'Close chat' : 'Open chat'}
                aria-expanded={open}
                className="relative flex size-12 items-center justify-center rounded-full bg-foreground text-background shadow-lg hover:opacity-90"
            >
                {open ? <X className="size-5" aria-hidden /> : <MessageCircle className="size-5" aria-hidden />}
                {unread > 0 && !open ? (
                    <span className="absolute -right-1 -top-1 flex min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[11px] font-semibold tabular-nums text-white">
                        {unread}
                    </span>
                ) : null}
            </button>
        </div>
    );
}
