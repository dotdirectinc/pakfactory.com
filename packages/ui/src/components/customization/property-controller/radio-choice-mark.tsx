import {cn} from "../../../lib/utils";

/** Classic radio glyph for filled choice chips: empty ring, or white ring + primary center. */
export function RadioChoiceMark({on}: {on: boolean}) {
  return (
    <span
      className={cn(
        "inline-flex size-3 shrink-0 items-center justify-center rounded-full border border-current",
        on && "bg-primary-foreground",
      )}
      aria-hidden
    >
      {on ? (
        <span className="size-1 shrink-0 rounded-full bg-primary" />
      ) : null}
    </span>
  );
}
