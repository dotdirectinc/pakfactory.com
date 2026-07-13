import type { ArticleInput } from "../types";
import { articleLike } from "./article-like";

export function article(input: ArticleInput): Record<string, unknown> {
  return articleLike("Article", input);
}
