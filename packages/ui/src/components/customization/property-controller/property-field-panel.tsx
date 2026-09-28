"use client";

import {useId, type ReactNode} from "react";
import {cn} from "../../../lib/utils";

export type PropertyFieldPanelProps = {
  title?: string;
  /** Selected value shown after the title (muted / normal weight). */
  titleValue?: string;
  /** Card chrome by default; ghost is borderless / unpadded for dense builder rails. */
  variant?: "card" | "ghost";
  children: ReactNode;
  className?: string;
};

/**
 * Titled card chrome around a property/type controller.
 * Controllers stay plain div field components — this is composition only.
 */
export function PropertyFieldPanel({
  title,
  titleValue,
  variant = "card",
  children,
  className,
}: PropertyFieldPanelProps) {
  const titleId = useId();
  const isCard = variant === "card";

  return (
    <div
      className={cn(
        isCard
          ? "overflow-hidden rounded-xl border border-border bg-card"
          : "flex flex-col gap-4",
        className,
      )}
      role="group"
      {...(title ? {"aria-labelledby": titleId} : {})}
    >
      {title ? (
        <div id={titleId} className={cn(isCard && "px-4 pt-4 pb-0")}>
          <p className="text-sm tracking-tight">
            <span className="font-semibold text-foreground">{title}</span>
            {titleValue ? (
              <>
                {": "}
                <span className="font-normal text-muted-foreground">
                  {titleValue}
                </span>
              </>
            ) : null}
          </p>
        </div>
      ) : null}
      <div className={cn("flex flex-col gap-2", isCard && "p-4")}>
        {children}
      </div>
    </div>
  );
}
