import type { PortableTextBlock } from "@portabletext/types";
import { PortableText } from "@/components/ui/portable-text";
import type { PostBodyCallout } from "@/lib/blog-post";
import { cn } from "@pakfactory/ui/lib/utils";

type BodyCalloutProps = {
  value: PostBodyCallout;
};

const TONE_CLASSES = {
  info: "border-l-primary bg-muted/30",
  tip: "border-l-amber-500 bg-amber-50/60 dark:bg-amber-950/20",
  warning: "border-l-orange-500 bg-orange-50/60 dark:bg-orange-950/20",
  success: "border-l-green-600 bg-green-50/60 dark:bg-green-950/20",
} as const;

function resolveTone(tone?: string): keyof typeof TONE_CLASSES {
  if (tone && tone in TONE_CLASSES) {
    return tone as keyof typeof TONE_CLASSES;
  }
  return "info";
}

/** Inline callout block authored in the post body portable text. */
export function BodyCallout({ value }: BodyCalloutProps) {
  if (!value.calloutBody?.length) return null;

  const tone = resolveTone(value.calloutTone);

  return (
    <aside
      className={cn(
        "my-8 rounded-lg border border-border border-l-4 px-5 py-4",
        TONE_CLASSES[tone]
      )}
      role="note"
    >
      {value.calloutTitle ? (
        <p className="mb-2 text-sm font-semibold tracking-tight text-foreground">
          {value.calloutTitle}
        </p>
      ) : null}
      <PortableText
        value={value.calloutBody as PortableTextBlock[]}
        className="text-sm leading-relaxed text-foreground [&_p:last-child]:mb-0"
      />
    </aside>
  );
}
