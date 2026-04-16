import type { PortableTextBlock } from "@portabletext/types";

export function plainTextFromBlocks(blocks: PortableTextBlock[] | undefined): string | undefined {
  if (!blocks?.length) return undefined;
  const parts: string[] = [];
  for (const block of blocks) {
    if (block._type === "block" && Array.isArray(block.children)) {
      for (const span of block.children) {
        if (span._type === "span" && typeof span.text === "string") {
          parts.push(span.text);
        }
      }
    }
  }
  const t = parts.join(" ").trim();
  return t || undefined;
}
