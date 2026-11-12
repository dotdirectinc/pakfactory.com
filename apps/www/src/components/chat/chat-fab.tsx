'use client';

import {useEffect, useMemo, useState} from 'react';
import {MessageCircle, X} from 'lucide-react';
import {useChatSettings} from '@/components/chat/chat-settings';
import {useChatContext} from '@/lib/chat/chat-context';
import {OPEN_CHAT_EVENT} from '@/lib/chat/open-chat';
import {createIntercomProvider} from '@/lib/chat/intercom';
import type {ChatProvider} from '@/lib/chat/chat-provider';

export {OPEN_CHAT_EVENT, openChat} from '@/lib/chat/open-chat';

/**
 * Site chat button (bottom-right). Launch: opens the Intercom Messenger (Global Settings →
 * Integrations → Show Intercom chat + App ID). Later the AI Sidekick replaces the provider,
 * not this button. Sits above the round compare button and lifts above the open compare bar
 * (reads `--compare-fab-stack` / `--compare-drawer-lift` from compare-bar.tsx).
 * On /request, `--chat-fab-offset` lifts it above the sticky submit strip.
 */
export function ChatFab() {
    const {intercomEnabled, intercomAppId} = useChatSettings();
    const appId = intercomEnabled ? intercomAppId?.trim() || null : null;
    const provider = useMemo<ChatProvider | null>(() => (appId ? createIntercomProvider(appId) : null), [appId]);
    const context = useChatContext();
    const [open, setOpen] = useState(false);
    const [unread, setUnread] = useState(0);

    useEffect(() => {
        if (!provider) return;
        provider.start();
        provider.onUnreadCount(setUnread);
        provider.onOpenChange(setOpen);
        return () => provider.shutdown();
    }, [provider]);

    // CMP-16: on /compare the team sees what the buyer is comparing.
    useEffect(() => {
        provider?.setContext(context);
    }, [provider, context]);

    useEffect(() => {
        if (!provider) return;
        const onOpen = () => provider.open();
        window.addEventListener(OPEN_CHAT_EVENT, onOpen);
        return () => window.removeEventListener(OPEN_CHAT_EVENT, onOpen);
    }, [provider]);

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
                onClick={() => (open ? provider.close() : provider.open())}
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
