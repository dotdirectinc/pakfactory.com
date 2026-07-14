import type { PortableTextComponents, PortableTextMarkComponentProps } from "@portabletext/react";
import Image from "next/image";
import { urlFor } from "@/lib/sanity/image";
import { GallerySlider } from "@pakfactory/components/modules/gallery-slider";

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
      link: ({ value, children }: PortableTextMarkComponentProps<any>) =>
        value?.href ? (
          <a
            href={value.href}
            className="text-primary underline underline-offset-4 hover:no-underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            {children}
          </a>
        ) : (
          <>{children}</>
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
      // Structure mirrors the POC: section → image fill → overlay → centered content → blockquote
      <figure className="not-prose relative my-10 overflow-hidden rounded-[14px] bg-foreground px-10 py-[30px]">
        {/* Fill 1 — background image at 100% */}
        {value.backgroundImage && (
          <Image
            src={urlFor(value.backgroundImage).width(900).height(500).url()}
            alt={value.backgroundImageAlt ?? ""}
            fill
            className="object-cover"
            sizes="800px"
          />
        )}
        {/* Fill 2 — #000 at 70% on top of the image */}
        <div aria-hidden="true" className="absolute inset-0 bg-black/70" />

        <div className="relative flex flex-col items-center gap-3">
          <blockquote className="flex items-start gap-2.5">
            <span
              aria-hidden="true"
              className="select-none text-2xl font-bold leading-none text-[#f4f1eb]/90"
            >
              &ldquo;
            </span>
            <p className="max-w-[559px] text-2xl leading-8 text-[#f4f1eb]">{value.quote}</p>
            <span
              aria-hidden="true"
              className="select-none self-end text-2xl font-bold leading-none text-[#f4f1eb]/90"
            >
              &rdquo;
            </span>
          </blockquote>

          {value.attributionName && (
            <p className="w-full max-w-[620px] text-right text-base font-bold leading-6 text-[#f4f1eb]">
              {value.attributionName}
            </p>
          )}
          {value.attributionRole && (
            <p className="w-full max-w-[620px] text-right text-sm leading-5 text-[#f4f1eb]">
              {value.attributionRole}
            </p>
          )}
        </div>
      </figure>
    ),

    caseStudyGalleryBlock: ({ value }) => {
      const rawImages: any[] = value.images ?? [];
      const isSquare = value.aspectRatio === "1:1";

      const resolved = rawImages
        .map((item: any, i: number) => {
          if (!item.image) return null;
          return {
            key: item._key ?? String(i),
            src: urlFor(item.image).width(1200).url(),
            alt: item.alt ?? "",
            caption: item.caption ?? null,
            isSquare,
          };
        })
        .filter(Boolean) as { key: string; src: string; alt: string; caption: string | null; isSquare: boolean }[];

      if (resolved.length === 0) return null;

      const galleryCaption: string | undefined = value.caption?.trim();

      return (
        <figure className="not-prose my-10">
          <GallerySlider images={resolved} />
          {galleryCaption && (
            <figcaption className="mt-3 text-center text-sm text-muted-foreground">
              {galleryCaption}
            </figcaption>
          )}
        </figure>
      );
    },
  },

  block: {
    normal: ({ children }) => (
      <p className="mb-5 text-base leading-7 text-foreground md:text-lg">{children}</p>
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
      <ul className="mb-5 ml-6 list-disc space-y-1.5 text-base text-foreground md:text-lg">
        {children}
      </ul>
    ),
    number: ({ children }) => (
      <ol className="mb-5 ml-6 list-decimal space-y-1.5 text-base text-foreground md:text-lg">
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
