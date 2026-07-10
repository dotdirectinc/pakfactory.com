import {PostCard, type PostCardData} from '@/components/modules/post-card';
import {PostList} from '@/components/modules/post-list';

export type PostFeaturedRowProps = {
    heading: string;
    headingId?: string;
    lead: PostCardData | null;
    secondary: PostCardData[];
    emptyLeadMessage?: string;
    emptyListMessage?: string;
};

/**
 * Shared lead + right-rail row layout for featured post bands (homepage + category).
 * Props-only — callers own data resolution and section shell.
 */
export function PostFeaturedRow({
    heading,
    headingId,
    lead,
    secondary,
    emptyLeadMessage,
    emptyListMessage = 'No published posts yet.',
}: PostFeaturedRowProps) {
    return (
        <div className="flex flex-col gap-10 lg:gap-8">
            <h2
                id={headingId}
                className="text-3xl font-semibold leading-tight tracking-tight"
            >
                {heading}
            </h2>
            <div className="flex flex-col gap-16 lg:grid lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] lg:gap-16">
                <div>
                    {lead ? (
                        <PostCard post={lead} variant="featuredLead" priority />
                    ) : emptyLeadMessage ? (
                        <p className="text-muted-foreground">
                            {emptyLeadMessage}
                        </p>
                    ) : null}
                </div>
                <div>
                    <PostList
                        posts={secondary}
                        variant="featuredListItem"
                        emptyMessage={emptyListMessage}
                    />
                </div>
            </div>
        </div>
    );
}
