import type { PortableTextComponents } from "@portabletext/react";
import Image from "next/image";
import { urlFor } from "@/lib/sanity/client";

/* eslint-disable @typescript-eslint/no-explicit-any */

export const caseStudyPtComponents: PortableTextComponents = {
  types: {
    caseStudyImage: ({ value }) => {
      if (!value.image) return null;
      const src = urlFor(value.image).url();
      const sizeClass =
        value.size === "half"
          ? "mx-auto w-1/2"
          : value.size === "wide"
            ? "w-3/4 mx-auto"
            : "w-full";
      return (
        <figure className={`not-prose my-10 ${sizeClass}`}>
          <div className="relative aspect-video overflow-hidden rounded-xl">
            <Image
              src={src}
              alt={value.alt ?? ""}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 800px"
            />
          </div>
          {value.caption && (
            <figcaption className="mt-2 text-center text-sm text-muted-foreground">
              {value.caption}
            </figcaption>
          )}
        </figure>
      );
    },

    caseStudyImageGallery: ({ value }) => {
      const images: any[] = value.images ?? [];
      const isSquare = value.aspectRatio === "1:1";
      return (
        <div
          className={`not-prose my-10 grid gap-3 ${images.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}
        >
          {images.map((item: any, i: number) => {
            if (!item.image) return null;
            const src = urlFor(item.image).url();
            return (
              <figure
                key={i}
                className={`relative overflow-hidden rounded-xl ${isSquare ? "aspect-square" : "aspect-video"}`}
              >
                <Image
                  src={src}
                  alt={item.caption ?? ""}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
                {item.caption && (
                  <figcaption className="absolute inset-x-0 bottom-0 bg-black/40 px-3 py-2 text-xs text-white">
                    {item.caption}
                  </figcaption>
                )}
              </figure>
            );
          })}
        </div>
      );
    },

    caseStudyQuote: ({ value }) => (
      <blockquote className="not-prose my-10 border-l-4 border-primary pl-6">
        <p className="text-xl font-medium italic leading-relaxed text-foreground">
          &ldquo;{value.quote}&rdquo;
        </p>
        {value.author && (
          <footer className="mt-5 flex items-center gap-3">
            {value.photo && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={urlFor(value.photo).width(80).height(80).url()}
                alt={value.author}
                className="size-10 rounded-full object-cover"
                width={40}
                height={40}
              />
            )}
            <div>
              <p className="text-sm font-semibold text-foreground">{value.author}</p>
              {value.role && (
                <p className="text-xs text-muted-foreground">{value.role}</p>
              )}
            </div>
          </footer>
        )}
      </blockquote>
    ),
  },

  block: {
    normal: ({ children }) => (
      <p className="mb-5 text-base leading-7 text-foreground">{children}</p>
    ),
    h2: ({ children }) => (
      <h2 className="mb-4 mt-10 text-2xl font-semibold tracking-tight text-foreground">
        {children}
      </h2>
    ),
    h3: ({ children }) => (
      <h3 className="mb-3 mt-8 text-xl font-semibold tracking-tight text-foreground">
        {children}
      </h3>
    ),
  },

  list: {
    bullet: ({ children }) => (
      <ul className="mb-5 ml-6 list-disc space-y-1.5 text-base text-foreground">
        {children}
      </ul>
    ),
    number: ({ children }) => (
      <ol className="mb-5 ml-6 list-decimal space-y-1.5 text-base text-foreground">
        {children}
      </ol>
    ),
  },

  listItem: {
    bullet: ({ children }) => <li className="leading-7">{children}</li>,
    number: ({ children }) => <li className="leading-7">{children}</li>,
  },

  marks: {
    strong: ({ children }) => (
      <strong className="font-semibold text-foreground">{children}</strong>
    ),
    em: ({ children }) => <em className="italic">{children}</em>,
    link: ({ value, children }) => (
      <a
        href={value?.href}
        className="text-primary underline underline-offset-4 hover:no-underline"
        target="_blank"
        rel="noopener noreferrer"
      >
        {children}
      </a>
    ),
  },
};
