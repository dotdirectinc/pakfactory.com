import Image from "next/image";
import {
  PortableText as PortableTextRoot,
  type PortableTextComponents,
} from "@portabletext/react";
import type { PortableTextBlock } from "@portabletext/types";
import { BodyCallout } from "@/components/modules/inline/body-callout";
import { BodyQuote } from "@/components/modules/inline/body-quote";
import { BodyGallery } from "@/components/modules/inline/body-gallery";
import { BodyTable } from "@/components/modules/inline/body-table";
import { BodyVideo } from "@/components/modules/inline/body-video";
import { BodyStatStack } from "@/components/modules/inline/body-stat-stack";
import { BodyBarChart } from "@/components/modules/inline/body-bar-chart";
import { WidgetRenderer } from "@/components/modules/widget/widget-renderer";
import type {
  PostBodyBarChart,
  PostBodyCallout,
  PostBodyGallery,
  PostBodyQuote,
  PostBodyStatStack,
  PostBodyTable,
  PostBodyVideo,
  PostBodyWidget,
} from "@/lib/blog-post";
import { sanityImageUrl } from "@/lib/sanity-image";

type BodyImageValue = {
  alt?: string;
  caption?: string;
  link?: string;
  linkNofollow?: boolean;
  asset?: unknown;
};

type WidgetEmbedValue = {
  widget?: PostBodyWidget | null;
};

function PostBodyImage({ value }: { value: BodyImageValue }) {
  const imageUrl = sanityImageUrl(value.asset, 1200);
  if (!imageUrl) return null;

  const img = (
    <Image
      src={imageUrl}
      alt={value.alt ?? ""}
      width={1200}
      height={675}
      className="h-auto w-full rounded-lg object-cover"
    />
  );

  return (
    <figure className="my-8">
      {value.link ? (
        <a
          href={value.link}
          rel={value.linkNofollow ? "nofollow noopener noreferrer" : "noopener noreferrer"}
          target="_blank"
        >
          {img}
        </a>
      ) : (
        img
      )}
      {value.caption ? (
        <figcaption className="mt-2 text-sm text-muted-foreground">
          {value.caption}
        </figcaption>
      ) : null}
    </figure>
  );
}

function createComponents(headingIdByKey: Record<string, string>): PortableTextComponents {
  return {
    block: {
      normal: ({ children }) => <p className="mb-4 leading-7 text-foreground">{children}</p>,
      h2: ({ children, value }) => {
        const id = value?._key ? headingIdByKey[value._key] : undefined;
        return (
          <h2
            id={id}
            className="mt-10 mb-4 scroll-mt-28 text-2xl font-semibold tracking-tight text-foreground"
          >
            {children}
          </h2>
        );
      },
      h3: ({ children, value }) => {
        const id = value?._key ? headingIdByKey[value._key] : undefined;
        return (
          <h3
            id={id}
            className="mt-8 mb-3 scroll-mt-28 text-xl font-semibold tracking-tight text-foreground"
          >
            {children}
          </h3>
        );
      },
      blockquote: ({ children }) => (
        <blockquote className="my-6 border-l-2 border-primary/40 pl-4 italic text-muted-foreground">
          {children}
        </blockquote>
      ),
    },
    list: {
      bullet: ({ children }) => (
        <ul className="mb-4 list-disc space-y-2 pl-5 leading-7">{children}</ul>
      ),
      number: ({ children }) => (
        <ol className="mb-4 list-decimal space-y-2 pl-5 leading-7">{children}</ol>
      ),
    },
    marks: {
      link: ({ value, children }) => {
        const href: string = value?.href ?? "#";
        const external = /^https?:\/\//.test(href);
        return (
          <a
            href={href}
            className="font-medium text-primary underline-offset-4 hover:underline"
            {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
          >
            {children}
          </a>
        );
      },
    },
    types: {
      bodyImage: ({ value }) => <PostBodyImage value={value as BodyImageValue} />,
      bodyQuote: ({ value }) => <BodyQuote value={value as PostBodyQuote} />,
      bodyGallery: ({ value }) => <BodyGallery value={value as PostBodyGallery} />,
      bodyVideo: ({ value }) => <BodyVideo value={value as PostBodyVideo} />,
      bodyStatStack: ({ value }) => (
        <BodyStatStack value={value as PostBodyStatStack} />
      ),
      bodyBarChart: ({ value }) => <BodyBarChart value={value as PostBodyBarChart} />,
      bodyTable: ({ value }) => <BodyTable value={value as PostBodyTable} />,
      bodyCallout: ({ value }) => <BodyCallout value={value as PostBodyCallout} />,
      widgetEmbed: ({ value }) => (
        <WidgetRenderer widget={(value as WidgetEmbedValue).widget} />
      ),
    },
  };
}

type PostPortableTextProps = {
  value?: PortableTextBlock[];
  headingIdByKey?: Record<string, string>;
  className?: string;
};

/** Post body renderer with heading anchors, body images, and embedded widgets. */
export function PostPortableText({
  value,
  headingIdByKey = {},
  className,
}: PostPortableTextProps) {
  if (!value?.length) return null;

  return (
    <div className={className}>
      <PortableTextRoot
        value={value}
        components={createComponents(headingIdByKey)}
      />
    </div>
  );
}
