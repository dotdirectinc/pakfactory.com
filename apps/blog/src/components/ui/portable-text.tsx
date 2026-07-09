import {
  PortableText as PortableTextRoot,
  type PortableTextComponents,
} from "@portabletext/react";
import type { PortableTextBlock } from "@portabletext/types";
import { externalLinkAttributes } from "@/lib/external-link";

const components: PortableTextComponents = {
  block: {
    normal: ({ children }) => <p className="mb-3 leading-relaxed">{children}</p>,
    h2: ({ children }) => (
      <h2 className="mt-6 mb-2 text-xl font-semibold tracking-tight">{children}</h2>
    ),
    h3: ({ children }) => (
      <h3 className="mt-4 mb-2 text-lg font-semibold tracking-tight">{children}</h3>
    ),
    blockquote: ({ children }) => (
      <blockquote className="my-4 border-l-2 border-border pl-4 italic text-muted-foreground">
        {children}
      </blockquote>
    ),
  },
  list: {
    bullet: ({ children }) => (
      <ul className="mb-3 list-disc space-y-1 pl-5">{children}</ul>
    ),
    number: ({ children }) => (
      <ol className="mb-3 list-decimal space-y-1 pl-5">{children}</ol>
    ),
  },
  marks: {
    link: ({ value, children }) => {
      const href: string = value?.href ?? "#";
      return (
        <a
          href={href}
          className="font-medium text-primary underline-offset-4 hover:underline"
          {...externalLinkAttributes(href)}
        >
          {children}
        </a>
      );
    },
  },
};

/** Renders Sanity portable text (post bodies, author bio/credentials). */
export function PortableText({
  value,
  className,
}: {
  value?: PortableTextBlock[];
  className?: string;
}) {
  if (!value?.length) return null;
  return (
    <div className={className}>
      <PortableTextRoot value={value} components={components} />
    </div>
  );
}
