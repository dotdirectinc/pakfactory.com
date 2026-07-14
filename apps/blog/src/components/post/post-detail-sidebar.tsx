import type { TocEntry } from "@/lib/post-toc";
import type { PostAuthor } from "@/components/post/post-author-card";
import { PostAuthorCard } from "@/components/post/post-author-card";
import { PostAskAi } from "@/components/post/post-ask-ai";
import { PostShareButtons } from "@/components/post/post-share-buttons";
import { PostTableOfContents } from "@/components/post/post-table-of-contents";

type PostDetailSidebarProps = {
  author?: PostAuthor;
  toc: TocEntry[];
  shareUrl: string;
  shareTitle: string;
};

/** Figma `blog_detail-page_sidebar` — author, table of contents, share, Ask AI. */
export function PostDetailSidebar({
  author,
  toc,
  shareUrl,
  shareTitle,
}: PostDetailSidebarProps) {
  return (
    <div className="flex flex-col gap-2 lg:h-full lg:border-r lg:border-dashed lg:border-border lg:pb-16 lg:pl-6 lg:pr-8">
      {author?.name ? (
        <div className="border-b border-dashed border-border pb-8">
          <PostAuthorCard author={author} />
        </div>
      ) : null}

      {/* Sticky from the table of contents down — pins once author scrolls past. */}
      <div className="flex flex-col gap-2 lg:sticky lg:top-24 lg:self-start lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto">
        {toc.length > 0 ? (
          <div className="border-b border-dashed border-border py-8">
            <PostTableOfContents entries={toc} />
          </div>
        ) : null}

        <div className="border-b border-dashed border-border py-8">
          <PostShareButtons url={shareUrl} title={shareTitle} />
        </div>

        <div className="pt-8">
          <PostAskAi url={shareUrl} title={shareTitle} />
        </div>
      </div>
    </div>
  );
}
