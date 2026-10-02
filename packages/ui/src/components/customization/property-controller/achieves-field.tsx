"use client";

import {useState, type KeyboardEvent} from "react";
import {cn} from "../../../lib/utils";
import type {AchievesTechnique} from "../types";

const rowClass = (on: boolean) =>
  cn(
    "flex w-full cursor-pointer items-center gap-3 rounded-[var(--radius-control)] border border-border bg-background p-3 text-left text-foreground transition-colors",
    "hover:bg-muted/60",
    "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
    on && "border-foreground bg-muted hover:bg-muted",
  );

export function AchievesField({
  techniques,
  consultationId,
  consultationLabel,
  learnMoreLabel = "Learn more",
  value: controlled,
  defaultValue,
  onChange,
}: {
  techniques: AchievesTechnique[];
  consultationId: string;
  consultationLabel: string;
  learnMoreLabel?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
}) {
  const [internal, setInternal] = useState(
    defaultValue ?? consultationId,
  );
  const selected = controlled ?? internal;
  const setSelected = (next: string) => {
    if (controlled === undefined) setInternal(next);
    onChange?.(next);
  };

  const onCardKeyDown = (
    event: KeyboardEvent<HTMLDivElement>,
    id: string,
  ) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setSelected(id);
    }
  };

  const consultationOn = selected === consultationId;

  return (
    <div
      className="flex flex-col gap-2"
      role="radiogroup"
      aria-label={consultationLabel}
    >
      <button
        type="button"
        role="radio"
        aria-checked={consultationOn}
        className={rowClass(consultationOn)}
        onClick={() => setSelected(consultationId)}
      >
        <span
          className="size-10 shrink-0 rounded-[var(--radius-control)] border-[3px] border-dotted border-muted-foreground bg-transparent"
          aria-hidden
        />
        <span className="text-sm font-medium tracking-tight text-foreground">
          {consultationLabel}
        </span>
      </button>

      {techniques.map((technique) => {
        const on = selected === technique.id;
        // Div (not button): may contain a learn-more link — nested interactives are invalid.
        return (
          <div
            key={technique.id}
            role="radio"
            tabIndex={0}
            aria-checked={on}
            className={rowClass(on)}
            onClick={() => setSelected(technique.id)}
            onKeyDown={(event) => onCardKeyDown(event, technique.id)}
          >
            {technique.imageUrl ? (
              <span
                className="size-10 shrink-0 rounded-[var(--radius-control)] border border-border bg-cover bg-center"
                style={{
                  backgroundImage: `url(${technique.imageUrl})`,
                }}
                aria-hidden
              />
            ) : (
              <span
                className="size-10 shrink-0 rounded-[var(--radius-control)] border border-dashed border-border bg-muted/40"
                aria-hidden
              />
            )}
            <span className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="text-sm font-medium tracking-tight text-foreground">
                {technique.title}
              </span>
              {technique.description ? (
                <span className="line-clamp-1 text-xs leading-relaxed text-muted-foreground">
                  {technique.description}
                </span>
              ) : null}
              {technique.learnMoreHref ? (
                <a
                  href={technique.learnMoreHref}
                  className="w-fit text-xs font-medium text-primary underline-offset-4 hover:underline"
                  onClick={(event) => event.stopPropagation()}
                >
                  {learnMoreLabel}
                </a>
              ) : null}
            </span>
          </div>
        );
      })}
    </div>
  );
}
