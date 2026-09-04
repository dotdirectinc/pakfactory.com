import * as React from "react"

import { cn } from "@pakfactory/ui/lib/utils"

function HighlightItem({
  className,
  selected = false,
  type = "button",
  ...props
}: React.ComponentProps<"button"> & {
  selected?: boolean
}) {
  return (
    <button
      data-slot="highlight-item"
      data-selected={selected ? "true" : undefined}
      type={type}
      aria-pressed={selected}
      className={cn(
        "cursor-pointer rounded-md px-4 py-4 text-left transition-colors disabled:cursor-not-allowed",
        selected ? "bg-muted" : "hover:bg-muted/60",
        className
      )}
      {...props}
    />
  )
}

export { HighlightItem }
