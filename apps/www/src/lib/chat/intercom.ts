'use client';

import Intercom, {
    hide,
    onHide,
    onShow,
    onUnreadCountChange,
    show,
    shutdown,
    update,
} from '@intercom/messenger-js-sdk';
import type {ChatContext} from '@/lib/chat/chat-context';
import type {ChatProvider} from '@/lib/chat/chat-provider';

/**
 * Intercom Messenger for website visitors without logins (Intercom: "For website visitors
 * without logins" — the conversation is kept in a browser cookie). Our own round button opens
 * it, so Intercom's launcher is hidden. Signed-in identification needs Messenger security
 * (a server-side token) and is not part of launch.
 */
export function createIntercomProvider(appId: string): ChatProvider {
    let started = false;
    return {
        start() {
            if (started) return;
            started = true;
            Intercom({app_id: appId, hide_default_launcher: true});
        },
        open() {
            show();
        },
        close() {
            hide();
        },
        setContext(context: ChatContext | null) {
            if (!started) return;
            // Custom attributes on the visitor: the team sees what was being compared.
            update({
                compare_group: context?.kind === 'compare' ? context.group : null,
                compare_items: context?.kind === 'compare' ? context.items.join(', ') : null,
            });
        },
        onUnreadCount(callback) {
            onUnreadCountChange((count: number) => callback(count));
        },
        onOpenChange(callback) {
            onShow(() => callback(true));
            onHide(() => callback(false));
        },
        shutdown() {
            if (!started) return;
            started = false;
            shutdown();
        },
    };
}
