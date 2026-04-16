// Source: shadcn-studio (packaging-hero-section)
import Image from "next/image";
import Link from "next/link";
import { PackageIcon } from "lucide-react";

import { Button } from "@pakfactory/ui/components/button";
import { cn } from "@pakfactory/ui/lib/utils";

export type PackagingHeroSectionProps = {
  title: string;
  description: string;
  primaryCta: { label: string; href: string };
  secondaryCta?: { label: string; href: string };
  /** CMS banner; placeholder shown when null or empty */
  image: { src: string | null; alt: string };
  className?: string;
};

/**
 * Two-column packaging hero: beige panel, bold headline, body copy, lime pill CTA, right-aligned product shot.
 */
export default function HeroSection({
  title,
  description,
  primaryCta,
  secondaryCta,
  image,
  className,
}: PackagingHeroSectionProps) {
  const src = image.src?.trim() ?? "";

  return (
    <section className={cn("flex-1", className)}>
      <div className="mx-auto max-w-7xl px-4 pt-4 pb-8 sm:px-6 sm:pt-5 sm:pb-10 lg:px-8 lg:pt-6 lg:pb-12">
        <div className="overflow-hidden rounded-2xl bg-[#F1F3E9] px-6 py-12 sm:px-10 sm:py-14 lg:rounded-3xl lg:px-16 lg:py-16">
          <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12 lg:gap-12 lg:gap-x-14">
            <div className="flex flex-col gap-8 text-center lg:col-span-7 lg:text-left">
              <h1 className="text-foreground text-3xl leading-tight font-bold tracking-tight text-balance sm:text-4xl lg:text-5xl">
                {title}
              </h1>
              <p className="text-foreground/80 mx-auto max-w-xl text-base leading-relaxed lg:mx-0 lg:text-lg">
                {description}
              </p>
              <div className="flex flex-col items-center gap-3 sm:flex-row sm:flex-wrap lg:justify-start">
                <Button
                  asChild
                  size="lg"
                  className="rounded-full border-0 bg-[#C7F0A9] px-10 text-emerald-950 shadow-none hover:bg-[#bce79d] dark:bg-[#C7F0A9] dark:text-emerald-950 dark:hover:bg-[#bce79d]"
                >
                  <Link href={primaryCta.href}>{primaryCta.label}</Link>
                </Button>
                {secondaryCta ? (
                  <Button
                    variant="link"
                    asChild
                    className="text-foreground/70 h-auto px-2 py-1 underline-offset-4 hover:text-foreground"
                  >
                    <Link href={secondaryCta.href}>{secondaryCta.label}</Link>
                  </Button>
                ) : null}
              </div>
            </div>

            <div className="relative flex w-full justify-center lg:col-span-5 lg:justify-end">
              <div className="relative aspect-4/3 w-full max-w-md lg:max-w-none lg:aspect-square">
                {src ? (
                  <Image
                    src={src}
                    alt={image.alt}
                    fill
                    className="object-contain object-center drop-shadow-[0_20px_40px_rgba(0,0,0,0.1)] lg:object-right"
                    sizes="(max-width: 1024px) 90vw, 42vw"
                    priority
                  />
                ) : (
                  <div className="bg-muted/30 text-muted-foreground flex h-full w-full items-center justify-center rounded-2xl">
                    <PackageIcon className="size-16 stroke-1 opacity-40" />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
