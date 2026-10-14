import {PageDielineSection} from '@pakfactory/ui/components/page-dieline-section';

import {PageBreadcrumbSection} from '@/components/common/page-breadcrumb-section';
import {NewsCatalogPanel} from '@/components/newsroom/news-catalog-panel';
import {NewsDetailHeader} from '@/components/newsroom/news-detail-header';
import {NewsPortableText} from '@/components/newsroom/news-portable-text';
import {PressBoilerplate} from '@/components/newsroom/press-boilerplate';
import {NEWSROOM_HEADING} from '@/components/newsroom/newsroom-catalog-page-loading';
import {SectionRenderer} from '@/components/sections/section-renderer';
import {
    buildNewsArticleJsonLd,
    buildNewsroomJsonLd,
} from '@/lib/newsroom/news-jsonld';
import type {
    NewsItem,
    NewsroomCatalog,
    PressBoilerplate as PressBoilerplateData,
} from '@/lib/newsroom/types';
import {WWW_ROUTES} from '@/lib/www-routes';

function JsonLd({json}: {json: string}) {
    return (
        <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{__html: json}}
        />
    );
}

/**
 * `/newsroom` body (PROD-2913) — the route renders the chrome above this. The
 * list is route-owned; `newsroomCatalogPage.sections` (the media-inquiries
 * band) render below it.
 */
export function NewsroomCatalogView({catalog}: {catalog: NewsroomCatalog}) {
    return (
        <>
            <JsonLd json={buildNewsroomJsonLd(catalog.items)} />
            <NewsCatalogPanel items={catalog.items} />
            <SectionRenderer sections={catalog.sections} />
        </>
    );
}

/**
 * `/newsroom/[slug]` (PROD-2918): breadcrumb, release, boilerplate, then the
 * layout's sections ("More announcements", media-inquiries band).
 */
export function NewsroomDetailView({
    item,
    boilerplate,
    canonicalUrl,
    imageUrl,
}: {
    item: NewsItem;
    boilerplate: PressBoilerplateData;
    canonicalUrl: string;
    /** Absolute image for NewsArticle (same chain as the OG image). */
    imageUrl?: string;
}) {
    const dateline = `${item.dateline.toUpperCase()}, ${item.dateLabel}`;

    return (
        <>
            <JsonLd json={buildNewsArticleJsonLd(item, boilerplate, imageUrl)} />
            <PageBreadcrumbSection
                items={[
                    {label: 'Home', href: WWW_ROUTES.home},
                    {label: NEWSROOM_HEADING, href: WWW_ROUTES.newsroom},
                    {label: item.title},
                ]}
            />
            <article>
                <NewsDetailHeader item={item} shareUrl={canonicalUrl} />
                <PageDielineSection
                    paddingBlock="none"
                    innerClassName="pb-16 pt-12 sm:pb-20 lg:pb-24"
                >
                    <div className="mx-auto max-w-3xl">
                        <NewsPortableText
                            value={item.body}
                            dateline={dateline}
                            titleFallback={item.title}
                        />
                        <PressBoilerplate boilerplate={boilerplate} />
                    </div>
                </PageDielineSection>
            </article>
            <SectionRenderer sections={item.sections} />
        </>
    );
}
