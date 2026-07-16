"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { SanityImage } from "@/components/ui/sanity-image";
import { cn } from "@pakfactory/ui/lib/utils";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@pakfactory/ui/components/carousel";
import type { CaseStudyCard } from "@pakfactory/sanity/queries";

function RelatedStudyCard({ study }: { study: CaseStudyCard }) {
  const displayName = study.client?.name || study.title;
  const href = `/case-studies/${study.slug}`;
  return (
    <article className="group flex flex-col gap-[14px]">
      <a href={href} className="block">
        <div className="relative aspect-square w-full overflow-hidden rounded-[10px] bg-muted">
          {study.cardImageUrl ? (
            <SanityImage
              src={study.cardImageUrl}
              alt={study.cardImageAlt ?? displayName}
              fill
              square
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
            />
          ) : (
            <div className="absolute inset-0 bg-muted" />
          )}
        </div>
      </a>
      <div className="flex flex-col gap-[14px]">
        <div className="flex flex-col gap-2.5">
          <p className="text-base font-medium leading-6 text-foreground">{displayName}</p>
          {study.cardSummary && (
            <p className="text-sm leading-5 text-muted-foreground">{study.cardSummary}</p>
          )}
        </div>
        <a
          href={href}
          className="inline-flex items-center gap-1.5 self-start text-sm font-medium text-foreground transition-colors hover:text-foreground/80"
        >
          Read Story
          <ArrowRight className="size-4" strokeWidth={1.75} />
        </a>
      </div>
    </article>
  );
}

type Props = {
  studies: CaseStudyCard[];
  heading: string;
  intro: string;
};

export function RelatedStudiesCarousel({ studies, heading, intro }: Props) {
  const [api, setApi] = useState<CarouselApi>();
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  const onSelect = useCallback((carouselApi: CarouselApi) => {
    if (!carouselApi) return;
    setCanPrev(carouselApi.canScrollPrev());
    setCanNext(carouselApi.canScrollNext());
  }, []);

  useEffect(() => {
    if (!api) return;
    onSelect(api);
    api.on("reInit", onSelect);
    api.on("select", onSelect);
    return () => {
      api.off("reInit", onSelect);
      api.off("select", onSelect);
    };
  }, [api, onSelect]);

  return (
    <Carousel
      className="flex flex-col gap-8 py-16"
      setApi={setApi}
      opts={{ align: "start", slidesToScroll: 1 }}
    >
      <header className="flex flex-wrap items-end justify-between gap-y-8 px-4 md:px-8">
        <div className="flex min-w-[280px] flex-1 flex-col gap-4">
          <h2 className="text-4xl font-medium leading-10 tracking-tight text-foreground">
            {heading}
          </h2>
          <p className="text-lg leading-7 text-muted-foreground">{intro}</p>
        </div>

        <div className="hidden w-[120px] items-center justify-center gap-4 md:flex">
          <button
            type="button"
            onClick={() => api?.scrollPrev()}
            disabled={!canPrev}
            className={cn(
              "inline-flex size-10 items-center justify-center rounded-full border border-border transition-colors",
              canPrev ? "bg-background hover:bg-muted" : "cursor-not-allowed bg-background opacity-40",
            )}
            aria-label="Previous"
          >
            <ArrowLeft className="size-4" strokeWidth={1.75} />
          </button>
          <button
            type="button"
            onClick={() => api?.scrollNext()}
            disabled={!canNext}
            className={cn(
              "inline-flex size-10 items-center justify-center rounded-full bg-primary text-primary-foreground transition-colors",
              canNext ? "hover:bg-primary/90" : "cursor-not-allowed opacity-40",
            )}
            aria-label="Next"
          >
            <ArrowRight className="size-4" strokeWidth={1.75} />
          </button>
        </div>
      </header>

      <div className="px-4 md:px-8">
        <CarouselContent className="-ml-6">
          {studies.map((s) => (
            <CarouselItem
              key={s._id}
              className="basis-full pl-6 md:basis-1/2 lg:basis-1/3"
            >
              <RelatedStudyCard study={s} />
            </CarouselItem>
          ))}
        </CarouselContent>
      </div>
    </Carousel>
  );
}
