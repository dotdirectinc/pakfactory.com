'use client';

import type {ChatContext} from '@/lib/chat/chat-context';
import type {ChatPageType} from '@/lib/chat/page-type';

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
    /**
     * The visitor moved to a new page (client-side navigation). The provider records the page
     * type and, for Intercom, re-checks its page-URL rules.
     */
    setPage: (pageType: ChatPageType) => void;
    /**
     * Something happened that the chat may answer, e.g. `idle` (no input for a while). Intercom
     * starts the matching proactive message; the AI Sidekick can open with its own question.
     */
    trackEvent: (name: ChatEventName, metadata?: Record<string, string | number>) => void;
    /** Called with the unread count whenever it changes. */
    onUnreadCount: (callback: (count: number) => void) => void;
    onOpenChange: (callback: (open: boolean) => void) => void;
    shutdown: () => void;
};

/** Events the site sends to the chat. Keep names stable: they are triggers in Intercom. */
export type ChatEventName = 'idle';

/** Global Settings → Integrations (Studio). */
export type ChatSettings = {
    intercomEnabled: boolean;
    intercomAppId: string | null;
};
