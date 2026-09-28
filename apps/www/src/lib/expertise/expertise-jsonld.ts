import {
    breadcrumbList,
    faqPage,
    jsonLdGraph,
    serializeJsonLd,
} from '@pakfactory/seo';
import type {PageSectionFaqSectionDoc} from '@pakfactory/sanity/queries';

import type {ExpertiseStagePage} from '@/lib/expertise/types';
import {absoluteUrl} from '@/lib/site';
import {expertiseHref, WWW_ROUTES} from '@/lib/www-routes';

/**
 * JSON-LD for an expertise stage page: BreadcrumbList, plus FAQPage built from
 * the FAQ sections the page actually renders (inherited or custom), so the
 * markup never claims questions that are not on the page.
 */
export function buildExpertiseStageJsonLd(stage: ExpertiseStagePage): string {
    const pageUrl = absoluteUrl(expertiseHref(stage.slug));
    const nodes: Record<string, unknown>[] = [
        breadcrumbList([
            {name: 'Home', url: absoluteUrl(WWW_ROUTES.home)},
            {name: 'Expertise', url: absoluteUrl(WWW_ROUTES.expertise)},
            {name: stage.title, url: pageUrl},
        ]),
    ];

    const seen = new Set<string>();
    const items: {question: string; answer: string}[] = [];
    for (const section of stage.sections ?? []) {
        if (section._type !== 'faqSection') continue;
        for (const faq of (section as PageSectionFaqSectionDoc).faqs ?? []) {
            const question = faq?.question?.trim();
            const answer = faq?.answerPlain?.trim();
            if (!question || !answer || seen.has(question)) continue;
            seen.add(question);
            items.push({question, answer});
        }
    }
    if (items.length > 0) {
        nodes.push(faqPage({items, id: `${pageUrl}#faq`}));
    }

    return serializeJsonLd(jsonLdGraph(nodes));
}
