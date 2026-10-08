"use client";

import { useEffect, useRef, useState } from "react";

const THRESHOLD = 4;

/** The column under the pointer: the nearest element carrying `data-col` in the same scope. */
function columnAt(x: number, y: number, scope: string): string | null {
  const el = document.elementFromPoint(x, y) as HTMLElement | null;
  const hit = el?.closest<HTMLElement>(`[data-col][data-col-scope="${scope}"]`);
  return hit?.dataset.col ?? null;
}

/**
 * Drag to reorder columns with pointer events (PROD-2926), Notion-style: press and move drags,
 * a press without movement is a click. Native HTML drag-and-drop cannot share an element with a
 * menu trigger that opens on pointer-down, and does not work inside menus — this does both.
 *
 * Elements that can be dropped on carry `data-col={key}` and `data-col-scope={scope}`.
 */
export function useColumnDrag(scope: string, onMove: (key: string, target: string) => void, onClick?: (key: string) => void) {
  const [dragging, setDragging] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const state = useRef<{ key: string; x: number; y: number; active: boolean } | null>(null);
  const handlers = useRef({ onMove, onClick });
  handlers.current = { onMove, onClick };

  useEffect(() => {
    const move = (e: PointerEvent) => {
      const s = state.current;
      if (!s) return;
      if (!s.active && Math.hypot(e.clientX - s.x, e.clientY - s.y) > THRESHOLD) {
        s.active = true;
        setDragging(s.key);
      }
      if (s.active) setOver(columnAt(e.clientX, e.clientY, scope));
    };
    const up = (e: PointerEvent) => {
      const s = state.current;
      if (!s) return;
      state.current = null;
      if (s.active) {
        // A menu item under the pointer turns this release into a click (Radix calls click() on
        // pointer-up): swallow that one click, so dropping on a column does not also toggle it.
        const swallow = (ev: MouseEvent) => {
          ev.stopPropagation();
          ev.preventDefault();
        };
        window.addEventListener("click", swallow, { capture: true, once: true });
        setTimeout(() => window.removeEventListener("click", swallow, { capture: true }), 0);
        const target = columnAt(e.clientX, e.clientY, scope);
        if (target && target !== s.key) handlers.current.onMove(s.key, target);
      } else {
        handlers.current.onClick?.(s.key);
      }
      setDragging(null);
      setOver(null);
    };
    window.addEventListener("pointermove", move);
    // Capture phase: runs before the item under the pointer handles the release.
    window.addEventListener("pointerup", up, true);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up, true);
    };
  }, [scope]);

  /** Spread on the drag handle. preventDefault stops text selection and a menu opening on press. */
  const handle = (key: string) => ({
    onPointerDown: (e: React.PointerEvent) => {
      if (e.button !== 0) return;
      e.preventDefault();
      state.current = { key, x: e.clientX, y: e.clientY, active: false };
    },
  });

  return { dragging, over, handle };
}
