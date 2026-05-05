import type { BlogPostingInput } from "../types";
import { articleLike } from "./article-like";

export function blogPosting(input: BlogPostingInput): Record<string, unknown> {
  return articleLike("BlogPosting", input);
}
