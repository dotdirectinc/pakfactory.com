/** Resolved topic group from GROQ (`topicGroup->{ title, slug }`). */
export type TopicGroupRef = {
  title?: string;
  slug?: string;
} | null;

/** Human label for a tag's CMS topic group. */
export function topicGroupTitle(
  topicGroup?: TopicGroupRef,
): string | undefined {
  return topicGroup?.title?.trim() || undefined;
}
