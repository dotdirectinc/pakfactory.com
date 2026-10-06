/**
 * English UI message catalog (www).
 *
 * Load `en` today. When locale routing ships, swap this module for a
 * locale-aware loader (e.g. next-intl) without changing Kind call sites.
 */
import en from '@/lib/i18n/messages/en.json';

export type Messages = typeof en;

const catalogs: Record<string, Messages> = {
    en,
};

/** Active locale until www i18n routing exists. */
const DEFAULT_LOCALE = 'en';

export function getMessages(locale: string = DEFAULT_LOCALE): Messages {
    return catalogs[locale] ?? catalogs[DEFAULT_LOCALE]!;
}

/**
 * Dot-path lookup into the active catalog (`kind.productLine`, `cta.industry`).
 * Missing keys throw in development so typos fail fast.
 */
export function t(
    path: string,
    locale: string = DEFAULT_LOCALE,
): string {
    const messages = getMessages(locale);
    const parts = path.split('.');
    let cursor: unknown = messages;
    for (const part of parts) {
        if (cursor == null || typeof cursor !== 'object') {
            throw new Error(`i18n: missing message "${path}"`);
        }
        cursor = (cursor as Record<string, unknown>)[part];
    }
    if (typeof cursor !== 'string') {
        throw new Error(`i18n: message "${path}" is not a string`);
    }
    return cursor;
}
