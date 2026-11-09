'use client';

import {useSyncExternalStore} from 'react';

/**
 * What the page is about, for the chat (compare spec CMP-16, owner Nov 9): on /compare the chat
 * opens already asking about the items being compared. A page sets it while mounted and clears it
 * on unmount. The chat provider (lib/chat/chat-provider) passes it on — Intercom at launch, the AI Sidekick later.
 */
export type ChatContext = {kind: 'compare'; group: string; items: string[]};

const EVENT = 'pf:chat-context';
let current: ChatContext | null = null;

export function setChatContext(next: ChatContext | null): void {
    current = next;
    if (typeof window !== 'undefined') window.dispatchEvent(new Event(EVENT));
}

function subscribe(cb: () => void): () => void {
    if (typeof window === 'undefined') return () => {};
    window.addEventListener(EVENT, cb);
    return () => window.removeEventListener(EVENT, cb);
}

export function useChatContext(): ChatContext | null {
    return useSyncExternalStore(subscribe, () => current, () => null);
}
