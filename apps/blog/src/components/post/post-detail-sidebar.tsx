import Link from "next/link";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@pakfactory/ui/components/avatar";
import type { TocEntry } from "@/lib/post-toc";
import { authorHref } from "@/lib/blog-post-url";
import { sanityImageUrl } from "@/lib/sanity-image";
import { PostAskAi } from "@/components/post/post-ask-ai";
import { PostShareButtons } from "@/components/post/post-share-buttons";
import { PostTableOfContents } from "@/components/post/post-table-of-contents";

type SidebarAuthor = {
  name?: string;
  slug?: string | null;
  photo?: unknown;
  role?: string;
  tagline?: string;
  shortBio?: string;
};

type PostDetailSidebarProps = {
  author?: SidebarAuthor;
  toc: TocEntry[];
  shareUrl: string;
  shareTitle: string;
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[parts.length - 1]![0] ?? ""}`.toUpperCase();
}

const dividerBlock = "border-b border-dashed border-border pb-8";
const dividerBlockNoPaddingBottom = "border-b border-dashed border-border"
/** Figma `blog_detail-page_sidebar` — author, table of contents, share, Ask AI. */
export function PostDetailSidebar({
  author,
  toc,
  shareUrl,
  shareTitle,
}: PostDetailSidebarProps) {
  const authorName = author?.name?.trim();
  const photoUrl = sanityImageUrl(author?.photo, 128);
  const bio = author?.shortBio?.trim() || author?.tagline?.trim();

  return (
    <div className="flex flex-col gap-6 lg:h-full lg:border-r lg:border-dashed lg:border-border lg:pr-6">
      {authorName ? (
        <div className={`flex flex-col gap-4 ${dividerBlock}`}>
          <p className="text-base font-medium text-muted-foreground">Written by</p>
          <div className="flex flex-col gap-5">
            <div className="flex items-center gap-5">
              <Avatar className="size-16">
                {photoUrl ? <AvatarImage src={photoUrl} alt="" /> : null}
                <AvatarFallback>{initials(authorName)}</AvatarFallback>
              </Avatar>
              {author?.slug ? (
                <Link
                  href={authorHref(author.slug)}
                  className="font-semibold text-foreground underline underline-offset-4 hover:text-foreground/80"
                >
                  {authorName}
                </Link>
              ) : (
                <span className="font-semibold text-foreground">{authorName}</span>
              )}
            </div>
            {bio ? (
              <p className="line-clamp-3 text-sm leading-5 text-muted-foreground">
                {bio}
              </p>
            ) : null}
          </div>
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
