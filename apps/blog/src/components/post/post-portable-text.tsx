import Image from "next/image";
import Link from "next/link";
import {
  PortableText as PortableTextRoot,
  type PortableTextComponents,
} from "@portabletext/react";
import type { PortableTextBlock } from "@portabletext/types";
import { Button } from "@pakfactory/ui/components/button";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@pakfactory/ui/components/card";
import type { PostBodyWidget } from "@/lib/blog-post";
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
        <figcaption className="mt-2 text-center text-sm text-muted-foreground">
          {value.caption}
        </figcaption>
      ) : null}
    </figure>
  );
}

function PostWidgetEmbed({ value }: { value: WidgetEmbedValue }) {
  const widget = value.widget;
  if (!widget?.widgetType) return null;

  if (widget.widgetType === "cta") {
    return (
      <Card className="my-8 bg-muted/30">
        <CardHeader>
          {widget.headline ? <CardTitle>{widget.headline}</CardTitle> : null}
          {widget.subtext ? <CardDescription>{widget.subtext}</CardDescription> : null}
        </CardHeader>
        {widget.buttonLabel && widget.buttonUrl ? (
          <CardFooter>
            <Button asChild variant={widget.variant === "secondary" ? "outline" : "default"}>
              <Link href={widget.buttonUrl}>{widget.buttonLabel}</Link>
            </Button>
          </CardFooter>
        ) : null}
      </Card>
    );
  }

  if (widget.widgetType === "product-card" && widget.productTitle) {
    return (
      <Card className="my-8">
        <CardHeader>
          <CardTitle>{widget.productTitle}</CardTitle>
          {widget.productExcerpt ? (
            <CardDescription>{widget.productExcerpt}</CardDescription>
          ) : null}
        </CardHeader>
        {widget.productSlug ? (
          <CardFooter>
            <Button asChild variant="outline">
              <Link href={`https://www.pakfactory.com/products/${widget.productSlug}`}>
                View product
              </Link>
            </Button>
          </CardFooter>
        ) : null}
      </Card>
    );
  }

  return null;
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
      widgetEmbed: ({ value }) => <PostWidgetEmbed value={value as WidgetEmbedValue} />,
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
