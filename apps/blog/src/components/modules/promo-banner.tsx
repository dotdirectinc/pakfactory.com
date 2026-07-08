import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { Button } from "@pakfactory/ui/components/button";
import { cn } from "@pakfactory/ui/lib/utils";
import type { BlogPromo } from "@/lib/blog-data";

type PromoImage = { url?: string };

/**
 * Blog promo banner (PROD-1896) — green full-width promo card.
 *
 * Content is editor-driven from the `promoBanner` page-builder block.
 * The fallbacks below are placeholders used only until an editor fills the
 * block — replace-by-content, no code change needed. Matches Figma 2405:27763.
 */
const FALLBACK = {
  heading: "Custom packaging, made simple",
  body: "From concept to delivery, PakFactory helps you design, prototype, and produce packaging that stands out.",
  ctaLabel: "Get started",
  ctaUrl: "/",
};

function PromoImageTile({
  src,
  className,
  sizes = "160px",
}: {
  src: string;
  className?: string;
  sizes?: string;
}) {
  return (
    <div className={cn("relative overflow-hidden rounded-xl", className)}>
      <Image
        src={src}
        alt=""
        fill
        className="object-cover"
        sizes={sizes}
      />
    </div>
  );
}

function PromoBannerImagePlaceholders() {
  return (
    <>
      <div className="size-32 rounded-xl bg-primary-foreground/10 md:size-40" />
      <div className="mt-6 size-32 rounded-xl bg-primary-foreground/10 md:size-40" />
    </>
  );
}

function PromoBannerImages({ images }: { images: PromoImage[] }) {
  if (images.length === 0) {
    return <PromoBannerImagePlaceholders />;
  }

  if (images.length === 1) {
    const image = images[0];
    if (!image?.url) return <PromoBannerImagePlaceholders />;

    return (
      <PromoImageTile
        src={image.url}
        className="aspect-[3/4] w-36 md:w-44"
        sizes="(max-width: 768px) 144px, 176px"
      />
    );
  }

  if (images.length === 2) {
    return (
      <>
        {images.map((img, i) => (
          <PromoImageTile
            key={img.url ?? i}
            src={img.url as string}
            className={cn("size-32 md:size-40", i === 1 && "mt-6")}
          />
        ))}
      </>
    );
  }

  const [leftTop, leftBottom, main] = images;
  if (!leftTop?.url || !leftBottom?.url || !main?.url) {
    return <PromoBannerImagePlaceholders />;
  }

  return (
    <>
      <div className="flex w-full flex-col gap-3 md:hidden">
        {images.map((img, i) => (
          <PromoImageTile
            key={img.url ?? i}
            src={img.url as string}
            className="aspect-[4/3] w-full max-w-[200px]"
            sizes="200px"
          />
        ))}
      </div>
      <div
        className="relative hidden h-48 w-full max-w-[280px] shrink-0 md:block md:h-56"
        aria-hidden
      >
        <PromoImageTile
          src={leftTop.url}
          className="absolute top-0 left-0 z-10 size-24 md:size-28"
          sizes="112px"
        />
        <PromoImageTile
          src={leftBottom.url}
          className="absolute bottom-0 left-4 z-10 h-28 w-20 md:left-5 md:h-32 md:w-24"
          sizes="96px"
        />
        <PromoImageTile
          src={main.url}
          className="absolute top-2 left-16 z-20 h-44 w-28 md:left-20 md:h-52 md:w-32"
          sizes="128px"
        />
      </div>
    </>
  );
}

export function PromoBanner({ promo }: { promo?: BlogPromo }) {
  const heading = promo?.heading?.trim() || FALLBACK.heading;
  const body = promo?.body?.trim() || FALLBACK.body;
  const ctaLabel = promo?.ctaLabel?.trim() || FALLBACK.ctaLabel;
  const ctaUrl = promo?.ctaUrl?.trim() || FALLBACK.ctaUrl;
  const images = (promo?.images ?? []).filter((img) => img?.url).slice(0, 3);

  return (
    <div className="overflow-hidden rounded-3xl bg-primary">
      <div className="flex flex-col items-center gap-6 p-6 md:flex-row md:items-center md:gap-10 md:p-10">
        <div
          className={cn(
            "flex shrink-0 justify-center",
            images.length === 2 ? "gap-4" : "w-full md:w-auto",
          )}
          aria-hidden
        >
          <PromoBannerImages images={images} />
        </div>

        <div className="flex w-full flex-col gap-4 md:flex-1">
          <h2 className="text-3xl font-semibold leading-tight tracking-tight text-primary-foreground md:text-4xl">
            {heading}
          </h2>
          <p className="max-w-[520px] text-lg leading-7 text-primary-foreground md:text-xl">
            {body}
          </p>
          <Button
            asChild
            className="mt-1 w-fit gap-2 rounded-[10px] bg-background px-6 text-base font-medium text-foreground hover:bg-background/90"
          >
            <Link href={ctaUrl}>
              {ctaLabel}
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
