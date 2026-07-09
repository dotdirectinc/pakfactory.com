import "server-only";

/** A single topic (blogTag) link on the Explore topics index. */
export type TopicLink = {
  _id: string;
  title: string;
  slug: string;
};

/** One group block on the Explore topics index (Material, Industry, …). */
export type TopicGroup = {
  /** Group slug for `?group=` deep links. */
  value: string;
  title: string;
  topics: TopicLink[];
};

export type TopicsIndexData = {
  /** Flat list in CMS sort order (JSON-LD, totals). */
  groups: TopicGroup[];
  leftColumnGroups: TopicGroup[];
  rightColumnGroups: TopicGroup[];
  totalTopics: number;
};

/** Hydrated `blogTopicGroup` row from Topic page `topics[]->` projection. */
export type TopicsPageGroupRow = {
  _id: string;
  title: string;
  slug: string;
  topics: TopicLink[];
};

function rowToTopicGroup(row: TopicsPageGroupRow): TopicGroup | null {
  if (!row.slug || !row.title) return null;
  return {
    value: row.slug,
    title: row.title,
    topics: row.topics ?? [],
  };
}

/** Balance groups across left/right mega-columns by list order. */
export function assignMegaColumns(groups: TopicGroup[]): {
  left: TopicGroup[];
  right: TopicGroup[];
} {
  const left: TopicGroup[] = [];
  const right: TopicGroup[] = [];

  for (const group of groups) {
    if (left.length <= right.length) {
      left.push(group);
    } else {
      right.push(group);
    }
  }

  return { left, right };
}

function finalizeTopicsIndex(groups: TopicGroup[]): TopicsIndexData {
  const totalTopics = groups.reduce(
    (sum, group) => sum + group.topics.length,
    0,
  );
  const { left, right } = assignMegaColumns(groups);

  return {
    groups,
    leftColumnGroups: left,
    rightColumnGroups: right,
    totalTopics,
  };
}

/**
 * Populated topic groups for the `/topics` landing (Explore topics).
 * Only groups listed on the Topic page Overview `topics[]` array are rendered.
 */
export async function fetchTopicsIndex(
  pageTopics?: TopicsPageGroupRow[] | null,
): Promise<TopicsIndexData> {
  const groups: TopicGroup[] = [];

  for (const row of pageTopics ?? []) {
    if (!row?._id) continue;
    const mapped = rowToTopicGroup(row);
    if (mapped) groups.push(mapped);
  }

  return finalizeTopicsIndex(groups);
}
