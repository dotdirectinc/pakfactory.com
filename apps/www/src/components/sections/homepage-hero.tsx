// Source: shadcn-studio (hero-section-32)
import Image from "next/image";
import Link from "next/link";
import { PackageIcon } from "lucide-react";

import type { AdvertisementCardProps } from "@/components/hero/hero-section-32/widget-advertisement";
import { Button } from "@pakfactory/ui/components/button";
import { TextFlip } from "@pakfactory/ui/components/text-flip";

export type HeroSection32Show = {
  img: string;
  name: string;
  time: string;
  date: string;
  showLink: string;
};

export type HeroSection32FeaturedCard = Pick<
  AdvertisementCardProps,
  "bannerUrl" | "bannerAlt" | "cardTitle" | "cardSubtitle" | "excerpt"
>;

/** When set, the right column shows this image (or the first `upcomingShows` image as fallback). */
export type HeroSection32FeaturedBanner = {
  url: string | null;
  alt?: string | null;
};

export type HeroSection32Props = {
  /** Optional; first item’s `img` is used as the hero visual when no banner URL is set. */
  upcomingShows?: HeroSection32Show[];
  badgeLabel?: string;
  flipWords?: string[];
  headlineLineBeforeFlip?: string;
  headlineLineAfterFlip?: string;
  featuredHeadline?: string | null;
  description?: string;
  primaryCta?: { label: string; href: string };
  secondaryCta?: { label: string; href: string };
  viewAllHref?: string;
  upcomingSectionTitle?: string;
  featuredBannerImage?: HeroSection32FeaturedBanner;
  featuredCard?: HeroSection32FeaturedCard;
};

const DEFAULT_FLIP = ["Show", "Event", "Ticket"];

const DEFAULT_DESCRIPTION =
  "Skip the long lines and enjoy the best entertainment experiences hassle-free, allowing you to fully immerse yourself in the fun and excitement.";

const HeroSection = ({
  upcomingShows = [],
  badgeLabel,
  flipWords = DEFAULT_FLIP,
  headlineLineBeforeFlip = "Book Your Next",
  headlineLineAfterFlip = "in Seconds",
  featuredHeadline,
  description = DEFAULT_DESCRIPTION,
  primaryCta = { label: "Book first show", href: "#" },
  secondaryCta,
  featuredBannerImage,
  featuredCard,
}: HeroSection32Props) => {
  const plainHeadline = featuredHeadline?.trim() ?? "";
  const usePlainHeadline = plainHeadline.length > 0;

  const bannerFromFeatured = featuredBannerImage?.url?.trim() ?? "";
  const bannerFromCard = featuredCard?.bannerUrl?.trim() ?? "";
  const bannerFromShows = upcomingShows[0]?.img?.trim() ?? "";
  const bannerSrc = bannerFromFeatured || bannerFromCard || bannerFromShows;
  const bannerAlt =
    featuredBannerImage?.alt?.trim() ||
    featuredCard?.bannerAlt?.trim() ||
    upcomingShows[0]?.name ||
    "Hero";

  const showBadge = Boolean(badgeLabel?.trim());

  return (
    <section className="flex-1">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
        <div className="overflow-hidden rounded-2xl bg-[#f1f5eb] px-6 py-12 sm:px-10 sm:py-14 lg:rounded-3xl lg:px-16 lg:py-20">
          <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-16">
            <div className="flex flex-col gap-6 text-center lg:text-left">
              {showBadge ? (
                <p className="text-xs font-semibold tracking-widest text-emerald-900/55 uppercase">
                  {badgeLabel}
                </p>
              ) : null}

              {usePlainHeadline ? (
                <h1 className="text-foreground text-3xl leading-tight font-bold tracking-tight text-balance sm:text-4xl lg:text-5xl">
                  {plainHeadline}
                </h1>
              ) : (
                <h1 className="text-foreground text-3xl leading-tight font-bold tracking-tight text-balance sm:text-4xl lg:text-5xl">
                  {headlineLineBeforeFlip} <br />
                  <TextFlip words={flipWords} /> {headlineLineAfterFlip}
                </h1>
              )}

              <p className="text-muted-foreground mx-auto max-w-xl text-base leading-relaxed lg:mx-0 lg:text-lg">
                {description}
              </p>

              <div className="flex flex-col items-center gap-3 sm:flex-row sm:flex-wrap lg:justify-start">
                <Button
                  asChild
                  size="lg"
                  className="rounded-full border-0 bg-[#c2e9a6] px-8 text-emerald-950 shadow-none hover:bg-[#b5de9a] dark:bg-[#c2e9a6] dark:text-emerald-950 dark:hover:bg-[#b5de9a]"
                >
                  <Link href={primaryCta.href}>{primaryCta.label}</Link>
                </Button>
                {secondaryCta ? (
                  <Button
                    variant="link"
                    asChild
                    className="text-emerald-900/80 h-auto px-2 py-1 underline-offset-4 hover:text-emerald-950"
                  >
                    <Link href={secondaryCta.href}>{secondaryCta.label}</Link>
                  </Button>
                ) : null}
              </div>
            </div>

            <div className="relative mx-auto flex w-full max-w-lg items-center justify-center lg:max-w-none">
              <div className="relative aspect-[4/3] w-full max-w-md lg:max-w-full lg:aspect-square">
                {bannerSrc ? (
                  <Image
                    src={bannerSrc}
                    alt={bannerAlt}
                    fill
                    className="object-contain object-center drop-shadow-[0_20px_40px_rgba(0,0,0,0.12)]"
                    sizes="(max-width: 1024px) 90vw, 50vw"
                    priority
                  />
                ) : (
                  <div className="bg-muted/40 text-muted-foreground flex h-full w-full items-center justify-center rounded-2xl">
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
};

export default HeroSection;
