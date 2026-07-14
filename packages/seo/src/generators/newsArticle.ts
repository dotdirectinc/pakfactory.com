import type { NewsArticleInput } from "../types";
import { articleLike } from "./article-like";

export function newsArticle(input: NewsArticleInput): Record<string, unknown> {
  return articleLike("NewsArticle", input);
}
