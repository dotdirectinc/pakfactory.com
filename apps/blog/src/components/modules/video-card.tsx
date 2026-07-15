import Image from "next/image";
import type { ReactNode } from "react";
import { Play } from "lucide-react";
import { cn } from "@pakfactory/ui/lib/utils";
import { SanityImage } from "@/components/ui/sanity-image";
import { isSanityCdnUrl } from "@/lib/sanity-image";
import type { ResolvedVideoSource } from "@/lib/resolve-video-source";

type VideoCardProps = {
  video: ResolvedVideoSource;
  variant?: "lead" | "grid";
  className?: string;
  thumbnailAction: ReactNode;
  titleAction: ReactNode;
};

/**
 * Props-only video card shell — layout, thumbnail, and title slots.
 * Interaction (link vs dialog trigger) is owned by VideoCardInteractive.
 */
export function VideoCard({
  video,
  variant = "grid",
  className,
  thumbnailAction,
  titleAction,
}: VideoCardProps) {
  const isLead = variant === "lead";

  return (
    <article
      className={cn(
        "group",
        isLead
          ? "flex flex-col gap-6 lg:grid lg:grid-cols-[minmax(0,717px)_1fr] lg:items-center lg:gap-8"
          : "flex flex-col gap-3",
        className,
      )}
    >
      {thumbnailAction}
      <h3
        className={cn(
          "font-semibold text-foreground",
          isLead
            ? "text-2xl leading-tight lg:text-3xl"
            : "text-base leading-snug",
        )}
      >
        {titleAction}
      </h3>
    </article>
  );
}

type VideoCardThumbnailProps = {
  video: ResolvedVideoSource;
  variant?: "lead" | "grid";
  wrapper: (content: ReactNode) => ReactNode;
};

export function VideoCardThumbnail({
  video,
  variant = "grid",
  wrapper,
}: VideoCardThumbnailProps) {
  const isLead = variant === "lead";

  return wrapper(
    <div className={cn("relative aspect-video w-full", isLead && "min-h-[200px]")}>
      {video.thumbnailUrl ? (
        isSanityCdnUrl(video.thumbnailUrl) ? (
          <SanityImage
            src={video.thumbnailUrl}
            alt=""
            fill
            className="object-cover"
            sizes={isLead ? "(min-width: 1024px) 717px, 100vw" : "(min-width: 1024px) 25vw, 50vw"}
          />
        ) : (
          <Image
            src={video.thumbnailUrl}
            alt=""
            fill
            className="object-cover"
            sizes={isLead ? "(min-width: 1024px) 717px, 100vw" : "(min-width: 1024px) 25vw, 50vw"}
            unoptimized={video.thumbnailUrl.includes("img.youtube.com")}
          />
        )
      ) : (
        <div className="absolute inset-0 bg-muted" aria-hidden />
      )}
      <span className="absolute inset-0 flex items-center justify-center bg-black/20 transition-colors group-hover:bg-black/30">
        <span className="flex size-14 items-center justify-center rounded-full bg-background/80 text-foreground shadow-md transition-transform duration-300 group-hover:scale-110">
          <Play className="size-6 fill-current" aria-hidden />
        </span>
      </span>
    </div>,
  );
}
