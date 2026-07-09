import Image from "next/image";
import Link from "next/link";
import { Play } from "lucide-react";
import { cn } from "@pakfactory/ui/lib/utils";
import type { ResolvedVideoSource } from "@/lib/resolve-video-source";

type VideoCardProps = {
  video: ResolvedVideoSource;
  variant?: "lead" | "grid";
  className?: string;
};

/**
 * Props-only video card — thumbnail, play overlay, title; links out to the source.
 */
export function VideoCard({ video, variant = "grid", className }: VideoCardProps) {
  const isLead = variant === "lead";

  return (
    <article className={cn("group flex flex-col gap-3", className)}>
      <Link
        href={video.href}
        target="_blank"
        rel="noopener noreferrer"
        className="relative block overflow-hidden rounded-xl bg-secondary"
        aria-label={`Watch video: ${video.title}`}
      >
        <div className={cn("relative aspect-video w-full", isLead && "min-h-[200px]")}>
          {video.thumbnailUrl ? (
            <Image
              src={video.thumbnailUrl}
              alt=""
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
              sizes={isLead ? "(min-width: 1024px) 717px, 100vw" : "(min-width: 1024px) 25vw, 50vw"}
              unoptimized={video.thumbnailUrl.includes("img.youtube.com")}
            />
          ) : (
            <div className="absolute inset-0 bg-muted" aria-hidden />
          )}
          <span className="absolute inset-0 flex items-center justify-center bg-black/20 transition-colors group-hover:bg-black/30">
            <span className="flex size-14 items-center justify-center rounded-full bg-background/95 text-foreground shadow-md">
              <Play className="size-6 fill-current" aria-hidden />
            </span>
          </span>
        </div>
      </Link>
      <h3
        className={cn(
          "font-semibold leading-snug text-foreground",
          isLead ? "text-xl lg:text-2xl" : "text-base",
        )}
      >
        <Link
          href={video.href}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:underline"
        >
          {video.title}
        </Link>
      </h3>
    </article>
  );
}
