import type { PageBuilderBlock } from "@/components/blocks/registry";
import type { HomePostCard } from "@/lib/blog-home";
import { fetchPopularPostsThisMonth } from "@/lib/blog-data";

/**
 * When GROQ returns fewer posts than `postsCount` for a postPopularRow block
 * (sparse month window), backfill from fetchPopularPostsThisMonth() which merges
 * month + latest posts.
 */
export async function enrichPopularRowBlocks(
  blocks: PageBuilderBlock[] | null | undefined,
): Promise<PageBuilderBlock[]> {
  if (!blocks?.length) return [];

  return Promise.all(
    blocks.map(async (block) => {
      if (block._type !== "postPopularRow") return block;

      const count = block.postsCount ?? 3;
      let posts = block.posts ?? [];

      if (posts.length < count) {
        const popular = await fetchPopularPostsThisMonth();
        posts = popular as HomePostCard[];
      }

      return {
        ...block,
        posts: posts.slice(0, count),
      };
    }),
  );
}
