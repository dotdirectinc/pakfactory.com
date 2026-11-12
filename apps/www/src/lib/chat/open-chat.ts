/** Fire this to open the chat from anywhere (e.g. a "Start chat" link). */
export const OPEN_CHAT_EVENT = 'pf:open-chat';

/** Dispatch-only — no Intercom import, so callers stay out of the chat SDK graph. */
export function openChat() {
    window.dispatchEvent(new CustomEvent(OPEN_CHAT_EVENT));
}
