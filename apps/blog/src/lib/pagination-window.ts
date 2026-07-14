/**
 * Returns a contiguous 1-based page window for numbered pagination controls.
 * Centers on `pageNumber` when possible; clamps at the start/end of the range.
 */
export function getPaginationWindow(
  pageNumber: number,
  totalPages: number,
  maxVisible = 5,
): number[] {
  if (totalPages <= 0) return [];
  if (totalPages <= maxVisible) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const half = Math.floor(maxVisible / 2);
  let start = pageNumber - half;
  let end = start + maxVisible - 1;

  if (start < 1) {
    start = 1;
    end = maxVisible;
  }

  if (end > totalPages) {
    end = totalPages;
    start = totalPages - maxVisible + 1;
  }

  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}
