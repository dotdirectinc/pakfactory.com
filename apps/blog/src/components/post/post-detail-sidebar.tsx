import type { TocEntry } from "@/lib/post-toc";
import { PostShareButtons } from "@/components/post/post-share-buttons";
import { PostTableOfContents } from "@/components/post/post-table-of-contents";

type PostDetailSidebarProps = {
  toc: TocEntry[];
  shareUrl: string;
  shareTitle: string;
};

export function PostDetailSidebar({
  toc,
  shareUrl,
  shareTitle,
}: PostDetailSidebarProps) {
  return (
    <div className="flex flex-col gap-10 border-b border-dashed border-border pb-10 lg:border-b-0 lg:pb-0">
      {toc.length > 0 ? (
        <div className="flex flex-col gap-4">
          <h2 className="text-base font-medium text-foreground">On this article</h2>
          <PostTableOfContents entries={toc} />
        </div>
      ) : null}
      <PostShareButtons url={shareUrl} title={shareTitle} />
    </div>
  );
}
