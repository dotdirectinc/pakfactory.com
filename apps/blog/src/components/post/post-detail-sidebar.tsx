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

const dividerBlock = "border-b border-dashed border-border pb-8";
const dividerBlockNoPaddingBottom = "border-b border-dashed border-border";

/** Figma `blog_detail-page_sidebar` — author, table of contents, share, Ask AI. */
export function PostDetailSidebar({
  author,
  toc,
  shareUrl,
  shareTitle,
}: PostDetailSidebarProps) {
  return (
    <div className="flex flex-col gap-6 lg:h-full lg:border-r lg:border-dashed lg:border-border lg:pr-6">
      {author?.name ? (
        <div className={dividerBlock}>
          <PostAuthorCard author={author} />
        </div>
      ) : null}

      {/* Sticky from the table of contents down — this block stays in view once
          the author card above has scrolled past. */}
      <div className="flex flex-col gap-6 lg:sticky lg:top-24 lg:self-start">
        {toc.length > 0 ? (
          <div className={dividerBlockNoPaddingBottom}>
            <PostTableOfContents entries={toc} />
          </div>
        ) : null}

        <div className={dividerBlock}>
          <PostShareButtons url={shareUrl} title={shareTitle} />
        </div>

        <PostAskAi url={shareUrl} title={shareTitle} />
      </div>
    </div>
  );
}
