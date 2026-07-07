import Link from "next/link";
import Image from "next/image";
import { Button } from "@pakfactory/ui/components/button";
import type { BlogPromo } from "@/lib/blog-data";

/**
 * Blog promo banner (PROD-1896) — green full-width promo card.
 *
 * Content is editor-driven from the `promoBanner` page-builder block.
 * The fallbacks below are placeholders used only until an editor fills the
 * block — replace-by-content, no code change needed. Matches Figma 2407:25166.
 */
const FALLBACK = {
  heading: "Custom packaging, made simple",
  body: "From concept to delivery, PakFactory helps you design, prototype, and produce packaging that stands out.",
  ctaLabel: "Get started",
  ctaUrl: "/",
};

export function PromoBanner({ promo }: { promo?: BlogPromo }) {
  const heading = promo?.heading?.trim() || FALLBACK.heading;
  const body = promo?.body?.trim() || FALLBACK.body;
  const ctaLabel = promo?.ctaLabel?.trim() || FALLBACK.ctaLabel;
  const ctaUrl = promo?.ctaUrl?.trim() || FALLBACK.ctaUrl;
  const images = (promo?.images ?? []).filter((img) => img?.url).slice(0, 2);

  return (
    <div className="overflow-hidden rounded-2xl bg-primary">
      <div className="flex flex-col items-center gap-6 md:flex-row md:gap-8">
        <div className="flex shrink-0 gap-4 p-6 md:p-8" aria-hidden>
          {images.length > 0 ? (
            images.map((img, i) => (
              <div
                key={img.url ?? i}
                className={`relative size-32 overflow-hidden rounded-xl md:size-40 ${
                  i === 1 ? "mt-6" : ""
                }`}
              >
                <Image
                  src={img.url as string}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="160px"
                />
              </div>
            ))
          ) : (
            <>
              <div className="size-32 rounded-xl bg-primary-foreground/10 md:size-40" />
              <div className="mt-6 size-32 rounded-xl bg-primary-foreground/10 md:size-40" />
            </>
          )}
        </div>

        <div className="flex flex-col gap-4 px-6 pb-8 md:py-8 md:pr-10 md:pl-0">
          <h2 className="text-2xl font-semibold leading-tight tracking-tight text-primary-foreground lg:text-3xl">
            {heading}
          </h2>
          <p className="max-w-[520px] text-base leading-7 text-primary-foreground/80">
            {body}
          </p>
          <Button
            asChild
            className="mt-1 w-fit rounded-full bg-background px-6 text-base font-medium text-foreground hover:bg-background/90"
          >
            <Link href={ctaUrl}>{ctaLabel}</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
