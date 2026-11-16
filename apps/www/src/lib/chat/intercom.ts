'use client';

import Intercom, {
    hide,
    onHide,
    onShow,
    onUnreadCountChange,
    show,
    shutdown,
    trackEvent,
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
            // Custom attributes on the visitor: the team sees what was being compared or viewed,
            // and proactive messages can name the product ({current_product}).
            update({
                compare_group: context?.kind === 'compare' ? context.group : null,
                compare_items: context?.kind === 'compare' ? context.items.join(', ') : null,
                current_product: context?.kind === 'product' ? context.name : null,
                current_product_slug: context?.kind === 'product' ? context.slug : null,
            });
        },
        setPage(pageType) {
            if (!started) return;
            // update() also sends the current URL, so Intercom re-checks page-URL rules after a
            // client-side navigation. Intercom throttles update() per visitor (see docs).
            update({page_type: pageType});
        },
        trackEvent(name, metadata) {
            if (!started) return;
            trackEvent(name, metadata);
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
