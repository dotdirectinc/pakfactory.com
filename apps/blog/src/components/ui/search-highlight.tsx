"use client";

type SearchHighlightProps = {
  text: string;
  query: string;
  className?: string;
};

/**
 * Highlights a case-insensitive query match inside text (ADR-013 presentational).
 */
export function SearchHighlight({ text, query, className }: SearchHighlightProps) {
  const needle = query.trim();
  if (!needle) {
    return <span className={className}>{text}</span>;
  }

  const lowerText = text.toLowerCase();
  const lowerNeedle = needle.toLowerCase();
  const start = lowerText.indexOf(lowerNeedle);

  if (start < 0) {
    return <span className={className}>{text}</span>;
  }

  const end = start + needle.length;

  return (
    <span className={className}>
      {text.slice(0, start)}
      <mark className="rounded-[1px] bg-primary/15 text-foreground">{text.slice(start, end)}</mark>
      {text.slice(end)}
    </span>
  );
}
