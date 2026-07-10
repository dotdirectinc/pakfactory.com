import type { PortableTextComponents, PortableTextMarkComponentProps } from "@portabletext/react";
import Image from "next/image";
import { urlFor } from "@/lib/sanity/image";

/* eslint-disable @typescript-eslint/no-explicit-any */

// Factory so the heroIntro clientLink annotation can resolve client->website.
export function makeHeroIntroPtComponents(clientWebsite?: string | null): PortableTextComponents {
  return {
    marks: {
      strong: ({ children }) => (
        <strong className="font-semibold text-foreground">{children}</strong>
      ),
      clientLink: ({ children }: PortableTextMarkComponentProps<any>) =>
        clientWebsite ? (
          <a
            href={clientWebsite}
            className="font-semibold text-foreground underline underline-offset-4 hover:no-underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            {children}
          </a>
        ) : (
          <strong className="font-semibold text-foreground">{children}</strong>
        ),
    },
    block: {
      normal: ({ children }) => (
        <p className="text-lg leading-7 text-foreground">{children}</p>
      ),
    },
  };
}

// Components for the three story sections (challenge / solution / result).
export const caseStudyPtComponents: PortableTextComponents = {
  types: {
    bodyImage: ({ value }) => {
      if (!value?.asset) return null;
      const src = urlFor(value.asset).url();
      return (
        <figure className="not-prose my-10 w-full">
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

    testimonialBlock: ({ value }) => (
      <figure className="not-prose relative my-10 min-h-[280px] overflow-hidden rounded-2xl">
        {value.backgroundImage ? (
          <Image
            src={urlFor(value.backgroundImage).width(900).height(500).url()}
            alt={value.backgroundImageAlt ?? ""}
            fill
            className="object-cover"
            sizes="800px"
          />
        ) : (
          <div className="absolute inset-0 bg-foreground" />
        )}
        <div className="absolute inset-0 bg-black/55" />
        <blockquote className="relative flex min-h-[280px] flex-col justify-between p-8 md:p-10">
          <div>
            <span className="block font-serif text-5xl leading-none text-white/80">&ldquo;</span>
            <p className="mt-3 max-w-[75%] text-xl font-semibold leading-snug text-white md:text-2xl">
              {value.quote}
            </p>
          </div>
          {(value.attributionName || value.attributionRole) && (
            <figcaption className="mt-6 flex items-end justify-end gap-x-2">
              <span className="self-end pb-1 font-serif text-3xl leading-none text-white/60">&rdquo;</span>
              <div className="text-right">
                {value.attributionName && (
                  <p className="text-base font-bold text-white">{value.attributionName}</p>
                )}
                {value.attributionRole && (
                  <p className="text-sm text-white/70">{value.attributionRole}</p>
                )}
              </div>
            </figcaption>
          )}
        </blockquote>
      </figure>
    ),

    caseStudyGalleryBlock: ({ value }) => {
      const images: any[] = value.images ?? [];
      const style: string = value.displayStyle ?? "twoUp";

      const gridClass =
        style === "twoUp"
          ? "grid-cols-2 gap-3"
          : style === "stacked"
            ? "grid-cols-1 gap-3"
            : "grid-cols-1"; // fullWidth

      return (
        <div className={`not-prose my-10 grid ${gridClass}`}>
          {images.map((item: any, i: number) => {
            if (!item.image) return null;
            const src = urlFor(item.image).url();
            return (
              <figure
                key={i}
                className="relative aspect-video overflow-hidden rounded-xl"
              >
                <Image
                  src={src}
                  alt={item.alt ?? ""}
                  fill
                  className="object-cover"
                  sizes={style === "twoUp" ? "(max-width: 768px) 100vw, 50vw" : "(max-width: 768px) 100vw, 800px"}
                />
                {item.caption && (
                  <figcaption className="absolute inset-x-0 bottom-0 bg-black/50 px-3 py-2 text-xs text-white">
                    {item.caption}
                  </figcaption>
                )}
              </figure>
            );
          })}
        </div>
      );
    },
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
