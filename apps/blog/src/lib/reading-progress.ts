export const READING_PROGRESS_SLOT_ID = "reading-progress-slot";
export const POST_ARTICLE_ID = "post-article";

/**
 * Article reading progress (0–1).
 * 0% when scroll is before the article top hits the viewport top;
 * 100% when the article bottom reaches the viewport bottom.
 */
export function getArticleReadingProgress(article: HTMLElement): number {
  const height = article.offsetHeight;
  if (height <= 0) return 0;

  const rect = article.getBoundingClientRect();
  const scrollY = window.scrollY;
  const viewportHeight = window.innerHeight;
  const articleStart = scrollY + rect.top;

  const traveled = scrollY - articleStart;
  if (traveled < 0) return 0;

  const scrollable = height - viewportHeight;
  if (scrollable <= 0) {
    return Math.min(1, traveled / height);
  }

  return Math.min(1, traveled / scrollable);
}
