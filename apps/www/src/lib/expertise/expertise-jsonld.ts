import {
    breadcrumbList,
    faqPage,
    jsonLdGraph,
    serializeJsonLd,
    service,
} from '@pakfactory/seo';
import type {PageSectionFaqSectionDoc} from '@pakfactory/sanity/queries';

import type {ExpertiseStagePage} from '@/lib/expertise/types';
import {companyOrganizationNode} from '@/lib/organization-node';
import type {CompanyRecord} from '@/lib/www-global-settings';
import {absoluteUrl} from '@/lib/site';
import {expertiseHref, WWW_ROUTES} from '@/lib/www-routes';

/**
 * JSON-LD for an expertise stage page: the Service itself, a BreadcrumbList, and
 * a FAQPage built from the FAQ sections the page actually renders (inherited or
 * custom), so the markup never claims questions that are not on the page.
 *
 * `Service` rather than `Product` because an Expertise Stage is a capability
 * PakFactory offers, not a thing a customer adds to a request (SEO Model §6).
 *
 * `provider` points at the `Organization` node in this same graph. With no
 * company name in Global Settings there is no node, and `provider` is omitted
 * rather than left pointing at an `@id` nothing defines (PROD-3230).
 */
export function buildExpertiseStageJsonLd(
    stage: ExpertiseStagePage,
    company: CompanyRecord | null = null,
): string {
    const pageUrl = absoluteUrl(expertiseHref(stage.slug));
    const publisher = companyOrganizationNode(company);
    const nodes: Record<string, unknown>[] = [
        ...(publisher ? [publisher.org] : []),
        service({
            id: `${pageUrl}#service`,
            name: stage.title,
            url: pageUrl,
            ...(stage.description ? {description: stage.description} : {}),
            ...(publisher ? {provider: {'@id': publisher.orgId}} : {}),
        }),
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
    const faq = faqPage({items, id: `${pageUrl}#faq`});
    if (faq) nodes.push(faq);

    return serializeJsonLd(jsonLdGraph(nodes));
}
