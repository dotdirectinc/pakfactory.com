import type { PortableTextBlock } from "@portabletext/types";
import { PortableText } from '@/components/ui/portable-text';

export type RichTextBandProps = {
  heading?: string;
  body?: PortableTextBlock[];
};

export function RichTextBand({ heading, body }: RichTextBandProps) {
  if (!heading && !body) return null;

  return (
    <section className="mx-auto max-w-3xl px-6 py-12">
      {heading ? (
        <h2 className="text-3xl font-bold tracking-tight">{heading}</h2>
      ) : null}
      {body ? (
        <div className={heading ? 'mt-6' : undefined}>
          <PortableText value={body} />
        </div>
      ) : null}
    </section>
  );
}
