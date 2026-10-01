/**
 * True when the environment supports reliable hover (desktop fine pointer).
 * Touch / coarse pointers should skip peek UI and rely on tap navigation.
 */
export function canHoverPeek(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }
  return window.matchMedia("(hover: hover) and (pointer: fine)").matches;
}
