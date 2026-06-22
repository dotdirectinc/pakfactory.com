import type { PortableTextBlock } from "@portabletext/types";

export type TocEntry = {
  id: string;
  text: string;
  level: 2 | 3;
};

function slugifyHeading(text: string): string {
  const base = text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return base || "section";
}

function blockPlainText(block: PortableTextBlock): string {
  if (!Array.isArray(block.children)) return "";
  return block.children
    .map((child) => ("text" in child ? child.text : ""))
    .join("")
    .trim();
}

/** Build TOC entries and stable heading ids keyed by portable-text block `_key`. */
export function buildPostToc(body: PortableTextBlock[] | null | undefined): {
  entries: TocEntry[];
  headingIdByKey: Record<string, string>;
} {
  if (!body?.length) {
    return { entries: [], headingIdByKey: {} };
  }

  const entries: TocEntry[] = [];
  const headingIdByKey: Record<string, string> = {};
  const usedIds = new Map<string, number>();

  for (const block of body) {
    if (block._type !== "block") continue;
    const style = block.style;
    if (style !== "h2" && style !== "h3") continue;

    const text = blockPlainText(block);
    if (!text) continue;

    const baseId = slugifyHeading(text);
    const seen = usedIds.get(baseId) ?? 0;
    const id = seen === 0 ? baseId : `${baseId}-${seen}`;
    usedIds.set(baseId, seen + 1);

    if (block._key) {
      headingIdByKey[block._key] = id;
    }

    entries.push({
      id,
      text,
      level: style === "h2" ? 2 : 3,
    });
  }

  return { entries, headingIdByKey };
}
