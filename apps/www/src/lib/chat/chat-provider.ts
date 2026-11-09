'use client';

import type {ChatContext} from '@/lib/chat/chat-context';

/**
 * The website chat behind one small interface, so pages and the chat button never talk to a
 * vendor directly. Launch: Intercom (lib/chat/intercom.ts). Next: the AI Sidekick — a second
 * implementation of this type, picked in `components/chat/chat-fab.tsx`.
 */
export type ChatProvider = {
    /** Load and start the chat (once). Anonymous visitors only for now. */
    start: () => void;
    open: () => void;
    close: () => void;
    /** What the page is about (e.g. the items on /compare), for the team or the assistant. */
    setContext: (context: ChatContext | null) => void;
    /** Called with the unread count whenever it changes. */
    onUnreadCount: (callback: (count: number) => void) => void;
    onOpenChange: (callback: (open: boolean) => void) => void;
    shutdown: () => void;
};

/** Global Settings → Integrations (Studio). */
export type ChatSettings = {
    intercomEnabled: boolean;
    intercomAppId: string | null;
};
