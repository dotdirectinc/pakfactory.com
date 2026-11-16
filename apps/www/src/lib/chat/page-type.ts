import type {ChatContext} from '@/lib/chat/chat-context';

/**
 * The kind of page the visitor is on, for the chat. Intercom messages use it as the `page_type`
 * visitor attribute (one idle prompt per page type). Keep the values stable: they are names in
 * Intercom rules, and the AI Sidekick reads the same values later.
 */
export type ChatPageType =
    | 'home'
    | 'products'
    | 'product'
    | 'customizations'
    | 'solutions'
    | 'bundles'
    | 'compare'
    | 'bookmarks'
    | 'request'
    | 'contact'
    | 'account'
    | 'auth'
    | 'other';

const SECTION_TYPES: Record<string, ChatPageType> = {
    products: 'products',
    customizations: 'customizations',
    solutions: 'solutions',
    bundles: 'bundles',
    compare: 'compare',
    bookmarks: 'bookmarks',
    request: 'request',
    contact: 'contact',
    account: 'account',
    login: 'auth',
    'sign-up': 'auth',
    'forgot-password': 'auth',
    'reset-password': 'auth',
    verify: 'auth',
    auth: 'auth',
};

/**
 * Page type from the path, made more exact by the page's chat context. `/products/<slug>` is a
 * product page or a product line, and only the page knows which — a product page sets a
 * `product` context.
 */
export function chatPageType(pathname: string | null, context: ChatContext | null = null): ChatPageType {
    if (context?.kind === 'product') return 'product';
    if (context?.kind === 'compare') return 'compare';
    const first = (pathname ?? '/').split('/').filter(Boolean)[0];
    if (!first) return 'home';
    return SECTION_TYPES[first] ?? 'other';
}

/**
 * Pages where the chat never prompts on its own: the visitor is filling in a form or is signed in
 * to do a task. The chat button still works there.
 */
const NO_PROMPT: ReadonlySet<ChatPageType> = new Set(['request', 'contact', 'account', 'auth']);

export function allowsIdlePrompt(pageType: ChatPageType): boolean {
    return !NO_PROMPT.has(pageType);
}
