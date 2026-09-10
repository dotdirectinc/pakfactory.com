import {unstable_cache} from 'next/cache';
import {getPublishedSanityClient} from '@/lib/sanity/client';
import {isSanityConfigured} from '@/lib/sanity/env';
import {
    resolveFooterAiLinks,
    resolveFooterColumns,
    resolveFooterCta,
    resolveFooterSocial,
    type RawFooterDoc,
} from '@/lib/footer-nav';
import {
    buildWwwV5FooterColumns,
    FOOTER_AI_LINKS,
    FOOTER_CTA,
    FOOTER_SOCIAL,
} from '@/lib/www-nav';
import {BLOG_FOOTER_NAV_QUERY} from '@pakfactory/sanity/queries';
import {
    WWW_CONTENT_REVALIDATE_SECONDS,
    WWW_FOOTER_CACHE_TAG,
} from '@/lib/www-cache';

function fallbackFooter() {
    return {
        columns: buildWwwV5FooterColumns(),
        social: FOOTER_SOCIAL,
        aiLinks: FOOTER_AI_LINKS,
        cta: FOOTER_CTA,
    };
}

async function loadWwwFooterData() {
    if (!isSanityConfigured()) {
        return fallbackFooter();
    }

    try {
        const doc = await getPublishedSanityClient().fetch<RawFooterDoc>(
            BLOG_FOOTER_NAV_QUERY,
        );
        return {
            columns: resolveFooterColumns(doc) ?? buildWwwV5FooterColumns(),
            social: resolveFooterSocial(doc) ?? FOOTER_SOCIAL,
            aiLinks: resolveFooterAiLinks(doc) ?? FOOTER_AI_LINKS,
            cta: resolveFooterCta(doc) ?? FOOTER_CTA,
        };
    } catch {
        return fallbackFooter();
    }
}

const getCachedWwwFooterData = unstable_cache(
    loadWwwFooterData,
    [WWW_FOOTER_CACHE_TAG],
    {
        revalidate: WWW_CONTENT_REVALIDATE_SECONDS,
        tags: [WWW_FOOTER_CACHE_TAG],
    },
);

export async function fetchWwwFooterData() {
    return getCachedWwwFooterData();
}
