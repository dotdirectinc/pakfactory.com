import {Breadcrumb} from '@/components/layout/breadcrumb';
import {Pagination, LISTING_TOP_ID} from '@/components/modules/pagination';
import {PerPageSelect} from '@/components/modules/per-page-select';
import {PostList} from '@/components/modules/post-list';
import {PageHeader} from '@/components/modules/page-header';
import {TopicRelatedPills} from '@/components/modules/topic-related-pills';
import type {CategoryOption} from '@/components/modules/topic-filter-bar';
import {CtaNewsletter} from '@/components/blocks/cta-newsletter';
import {
    PageDielineBlockRail,
} from '@/components/layout/page-dieline-section';
import {TopicLandingLayout} from '@/components/views/topic-landing-layout';
import {TopicListingSection} from '@/components/views/topic-listing-section';
import {pagedHeading} from '@/lib/archive-format';
import {PAGE_SIZE_OPTIONS} from '@/lib/blog-archive';
import {tagPageHref, type TagArchivePageData} from '@/lib/blog-tag-archive';
import {toPostCardDataList} from '@/lib/post-card-data';
import {buildTagArchiveJsonLd} from '@/lib/tag-archive-jsonld';

export function TopicArchiveView({
    data,
    categoryOptions,
}: {
    data: TagArchivePageData;
    categoryOptions: CategoryOption[];
}) {
    const jsonLd = buildTagArchiveJsonLd(
        data.tag,
        data.posts,
        data.pageNumber,
        data.filters,
    );
    const heading = pagedHeading(data.tag.title, data.pageNumber);
    const gridPosts = toPostCardDataList(data.posts);
    const perPage = data.perPage;

    return (
        <TopicLandingLayout
            jsonLd={jsonLd}
            breadcrumb={
                <Breadcrumb
                    items={[
                        {label: 'Blog', href: '/'},
                        {label: 'Topics', href: '/topics'},
                        {label: data.tag.title},
                    ]}
                />
            }
            header={
                <PageHeader
                    title={heading}
                    descriptionText={data.tag.descriptionText}
                    belowContent={
                        <TopicRelatedPills topics={data.cooccurringTags} />
                    }
                />
            }
        >
            <TopicListingSection
                tagSlug={data.tag.slug}
                filters={data.filters}
                categoryOptions={categoryOptions}
                perPage={perPage}
                pagination={
                    data.totalCount > 0 ? (
                        <Pagination
                            pageNumber={data.pageNumber}
                            totalPages={data.totalPages}
                            hrefForPage={(page) =>
                                tagPageHref(data.tag.slug, page, data.filters, perPage)
                            }
                            ariaLabel="Topic archive pagination"
                            scrollTargetId={LISTING_TOP_ID}
                            rightSlot={
                                <PerPageSelect
                                    value={perPage}
                                    options={PAGE_SIZE_OPTIONS.map((size) => ({
                                        size,
                                        href: tagPageHref(
                                            data.tag.slug,
                                            1,
                                            data.filters,
                                            size,
                                        ),
                                    }))}
                                />
                            }
                        />
                    ) : null
                }
            >
                <PostList
                    posts={gridPosts}
                    columns={3}
                    priorityFirst
                    emptyMessage="No posts match your filters for this topic."
                />
            </TopicListingSection>
            <PageDielineBlockRail>
                <CtaNewsletter showTopBorder={false} showBottomBorder={false} />
            </PageDielineBlockRail>
        </TopicLandingLayout>
    );
}
