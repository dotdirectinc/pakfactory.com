import {
    PortableText as PortableTextRoot,
    type PortableTextComponents,
    type PortableTextListItemComponent,
} from '@portabletext/react';
import type {PortableTextBlock} from '@portabletext/types';
import {BodyCallout} from '@/components/modules/inline/body-callout';
import {BodyQuote} from '@/components/modules/inline/body-quote';
import {BodyGallery} from '@/components/modules/inline/body-gallery';
import {BodyTable} from '@/components/modules/inline/body-table';
import {BodyVideo} from '@/components/modules/inline/body-video';
import {BodyStatStack} from '@/components/modules/inline/body-stat-stack';
import {BodyBarChart} from '@/components/modules/inline/body-bar-chart';
import {BodyEmbed} from '@/components/modules/inline/body-embed';
import {WidgetRenderer} from '@/components/modules/widget/widget-renderer';
import {CAPTION_CLASS} from '@/lib/blog-caption';
import {SanityImage} from '@/components/ui/sanity-image';
import type {
    PostBodyBarChart,
    PostBodyCallout,
    PostBodyGallery,
    PostBodyQuote,
    PostBodyStatStack,
    PostBodyTable,
    PostBodyEmbed,
    PostBodyVideo,
    PostBodyWidget,
} from '@/lib/blog-post';
import {sanityImageBaseUrl} from '@/lib/sanity-image';
import {EXTERNAL_LINK_REL, externalLinkAttributes} from '@/lib/external-link';

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

function PostBodyImage({value}: {value: BodyImageValue}) {
    const imageUrl = sanityImageBaseUrl(value.asset);
    if (!imageUrl) return null;

    const img = (
        <SanityImage
            src={imageUrl}
            alt={value.alt ?? ''}
            width={1200}
            height={675}
            sizes="(max-width: 768px) 100vw, 720px"
            className="h-auto w-full rounded-lg object-cover"
        />
    );

    return (
        <figure className="my-8">
            {value.link ? (
                <a href={value.link} rel={EXTERNAL_LINK_REL} target="_blank">
                    {img}
                </a>
            ) : (
                img
            )}
            {value.caption ? (
                <figcaption className={CAPTION_CLASS}>
                    {value.caption}
                </figcaption>
            ) : null}
        </figure>
    );
}

function createComponents(headingIdByKey: Record<string, string>): PortableTextComponents {
  return {
    block: {
      normal: ({ children }) => <p className="mb-8 leading-7 text-muted-foreground">{children}</p>,
      h2: ({ children, value }) => {
        const id = value?._key ? headingIdByKey[value._key] : undefined;
        return (
          <h2
            id={id}
            className="mt-10 mb-4 scroll-mt-28 text-2xl font-semibold tracking-tight text-foreground lg:text-3xl"
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
      bodyEmbed: ({ value }) => <BodyEmbed value={value as PostBodyEmbed} />,
      bodyCallout: ({ value }) => <BodyCallout value={value as PostBodyCallout} />,
      widgetEmbed: ({ value }) => (
        <WidgetRenderer widget={(value as WidgetEmbedValue).widget} />
      ),
    },
  };
}

const NumberedListItem: PortableTextListItemComponent = function NumberedListItem({ children, index }) {
    return (
        <li className="flex items-start gap-4">
            <span className="shrink-0 text-2xl font-semibold tabular-nums leading-7 text-primary/40">
                {String(index + 1).padStart(2, '0')}
            </span>
            <span className="text-base leading-7 text-foreground">{children}</span>
        </li>
    );
}

const TLDR_COMPONENTS: PortableTextComponents = {
    block: {
        normal: ({ children }) => (
            <p className="text-base leading-7 text-foreground">{children}</p>
        ),
    },
    list: {
        bullet: ({ children }) => <ul className="flex flex-col gap-4">{children}</ul>,
        number: ({ children }) => <ol className="flex flex-col gap-4">{children}</ol>,
    },
    listItem: {
        bullet: NumberedListItem,
        number: NumberedListItem,
    },
};

type PostPortableTextProps = {
    value?: PortableTextBlock[];
    headingIdByKey?: Record<string, string>;
    className?: string;
    variant?: 'default' | 'tldr';
};

/** Post body renderer with heading anchors, body images, and embedded widgets. */
export function PostPortableText({
    value,
    headingIdByKey = {},
    className,
    variant = 'default',
}: PostPortableTextProps) {
    if (!value?.length) return null;

    const components =
        variant === 'tldr' ? TLDR_COMPONENTS : createComponents(headingIdByKey);

    return (
        <div className={className}>
            <PortableTextRoot value={value} components={components} />
        </div>
    );
}
