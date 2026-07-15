"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import type { PostCardData } from "@/components/modules/post-card";
import { SanityImage } from "@/components/ui/sanity-image";

const ROTATE_MS = 5000;
const DESKTOP_MQ = "(min-width: 1024px)";

/**
 * PostFeaturedRotator — the "Featured Posts" hero, ported from the approved
 * POC (`blog-poc` BlogFeaturedHeroWebflow). Left: the lead preview
 * (category → image → title → excerpt → meta) auto-rotates through the
 * slides, crossfading every few seconds. Right: text-only rows with hairline
 * dividers and a circular primary arrow that tracks the shown post. Hovering
 * or focusing a row shows it on the left; auto-rotation pauses while the
 * block is hovered. Respects `prefers-reduced-motion` (no auto-rotate).
 *
 * Below `lg`: rotation is off, lead stays on the first slide, list rows show
 * left thumbnails (no arrow). Props-only (ADR-013). All slides render in the
 * initial HTML (rows + image stack) — AEO-safe.
 * Motion values per docs/plans/PROD-1947-motion-animation-spec.md.
 */
export type PostFeaturedRotatorProps = {
  heading: string;
  headingId?: string;
  slides: PostCardData[];
};

function Meta({ post }: { post: PostCardData }) {
  const parts = [
    post.authorName,
    post.readingTimeLabel,
    post.formattedDate,
  ].filter(Boolean);
  if (parts.length === 0) return null;
  return (
    <p className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
      {parts.map((part, i) => (
        <span key={`${part}-${i}`} className="flex items-center gap-1.5">
          {i > 0 && <span aria-hidden>·</span>}
          <span className={i === 0 && part === post.authorName ? "font-medium text-foreground" : undefined}>
            {part}
          </span>
        </span>
      ))}
    </p>
  );
}

function CategoryLabel({ title }: { title?: string }) {
  if (!title) return null;
  return (
    <span className="text-xs font-semibold uppercase tracking-wide text-primary">
      {title}
    </span>
  );
}

export function PostFeaturedRotator({
  heading,
  headingId,
  slides,
}: PostFeaturedRotatorProps) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(DESKTOP_MQ);
    const sync = () => {
      setIsDesktop(mq.matches);
      if (!mq.matches) setActive(0);
    };
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (!isDesktop || paused || slides.length < 2) return undefined;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return undefined;
    }
    const id = setInterval(
      () => setActive((i) => (i + 1) % slides.length),
      ROTATE_MS,
    );
    return () => clearInterval(id);
  }, [isDesktop, paused, slides.length]);

  const lead = slides[Math.min(active, slides.length - 1)];
  if (!lead) return null;

  const selectSlide = (i: number) => {
    if (isDesktop) setActive(i);
  };

  return (
    <div className="flex flex-col gap-8">
      <h2
        id={headingId}
        className="text-2xl font-semibold leading-tight tracking-tight text-foreground lg:text-3xl"
      >
        {heading}
      </h2>

      <div
        className="grid grid-cols-1 gap-10 lg:grid-cols-[1.4fr_1fr] lg:gap-16"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        {/* Left — lead preview, crossfades through the slides (desktop) */}
        <Link
          href={lead.href}
          className="flex flex-col gap-5 text-foreground no-underline"
        >
          <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-secondary shadow-[0_2px_8px_-2px_rgba(0,0,0,0.08)]">
            {slides.map((post, i) =>
              post.imageUrl ? (
                <SanityImage
                  key={post._id}
                  src={post.imageUrl}
                  alt={i === active ? (post.imageAlt ?? post.title) : ""}
                  aria-hidden={i !== active}
                  fill
                  sizes="(min-width: 1024px) 56vw, 100vw"
                  priority={i === 0}
                  className={`object-cover transition-opacity duration-700 ease-out ${
                    i === active ? "opacity-100" : "opacity-0"
                  }`}
                />
              ) : null,
            )}
          </div>
          <div
            key={lead._id}
            className="flex flex-col gap-2.5 duration-500 animate-in fade-in slide-in-from-bottom-2 max-lg:animate-none"
          >
            <CategoryLabel title={lead.categoryTitle} />
            <h3 className="text-2xl font-semibold leading-snug tracking-tight text-foreground lg:text-3xl">
              {lead.title}
            </h3>
            {lead.excerpt && (
              <p className="text-base leading-7 text-muted-foreground">
                {lead.excerpt}
              </p>
            )}
            <Meta post={lead} />
          </div>
        </Link>

        {/* Right — slide rows; desktop arrow tracks the shown post */}
        <ul className="flex flex-col self-start border-y border-border">
          {slides.map((post, i) => {
            const isActive = i === active;
            return (
              <li key={post._id} className={i > 0 ? "border-t border-border" : ""}>
                <Link
                  href={post.href}
                  onMouseEnter={() => selectSlide(i)}
                  onFocus={() => selectSlide(i)}
                  className="group/row flex gap-4 py-5 text-foreground no-underline lg:items-center lg:justify-between lg:gap-6"
                >
                  {post.imageUrl ? (
                    <span className="relative w-20 shrink-0 self-stretch overflow-hidden rounded-md bg-secondary lg:hidden">
                      <SanityImage
                        src={post.imageUrl}
                        alt=""
                        fill
                        className="object-cover"
                        sizes="80px"
                      />
                    </span>
                  ) : null}
                  <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                    <CategoryLabel title={post.categoryTitle} />
                    <h3
                      className={`text-lg font-semibold leading-7 tracking-tight transition-colors duration-300 group-hover/row:text-primary ${
                        isActive && isDesktop ? "text-primary" : "text-foreground"
                      }`}
                    >
                      {post.title}
                    </h3>
                    <Meta post={post} />
                  </div>
                  <span
                    aria-hidden="true"
                    className={`hidden size-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md transition-all duration-300 ease-out lg:flex group-hover/row:translate-x-0 group-hover/row:scale-100 group-hover/row:opacity-100 ${
                      isActive
                        ? "translate-x-0 scale-100 opacity-100"
                        : "-translate-x-2 scale-75 opacity-0"
                    }`}
                  >
                    <svg
                      className="size-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M5 12h14M13 6l6 6-6 6" />
                    </svg>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
