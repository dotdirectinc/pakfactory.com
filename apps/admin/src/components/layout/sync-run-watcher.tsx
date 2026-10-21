"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { syncRunStatusAction } from "@/app/(admin)/spec/actions";
import { SYNC_WATCH_EVENT, SYNC_WATCH_KEY } from "@/lib/spec/sync-watch";
import { ADMIN_SPEC_SYNC_COPY as COPY } from "@/lib/copy/spec";

const EVERY_MS = 3000;
/** A run nobody heard back from in this long is left to the Registry page. */
const GIVE_UP_MS = 20 * 60_000;

type Watching = { id: string; since: number };

function read(): Watching | null {
  try {
    const raw = sessionStorage.getItem(SYNC_WATCH_KEY);
    return raw ? (JSON.parse(raw) as Watching) : null;
  } catch {
    return null;
  }
}

function clear() {
  try {
    sessionStorage.removeItem(SYNC_WATCH_KEY);
  } catch {
    // nothing to clear
  }
}

/**
 * Follows the sync run this tab started, from any page (2026-10-21). When it ends: a toast saying
 * what it produced, with a link to the Registry, and a refresh — which also updates the sidebar's
 * waiting count. Lives in the shell, so moving between pages does not lose it.
 */
export function SyncRunWatcher() {
  const router = useRouter();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let stopped = false;

    const poll = async (w: Watching) => {
      if (stopped) return;
      if (Date.now() - w.since > GIVE_UP_MS) return clear();
      const status = await syncRunStatusAction(w.id).catch(() => null);
      if (stopped || read()?.id !== w.id) return;
      if (!status || status.open) {
        timer.current = setTimeout(() => void poll(w), EVERY_MS);
        return;
      }
      clear();
      const name = COPY.finishedNames[status.kind];
      if (status.failed) toast.error(COPY.finishedFailed(name), { description: status.error ?? undefined, duration: 15000 });
      else
        toast.success(status.frames ? COPY.finished(name, status.frames, status.items) : COPY.finishedNothing(name), {
          duration: 15000,
          action: status.frames ? { label: COPY.finishedView, onClick: () => router.push("/spec") } : undefined,
        });
      router.refresh();
    };

    const start = (w: Watching | null) => {
      if (timer.current) clearTimeout(timer.current);
      if (w) void poll(w);
    };

    start(read());
    const onWatch = (e: Event) => start((e as CustomEvent<Watching>).detail);
    window.addEventListener(SYNC_WATCH_EVENT, onWatch);
    return () => {
      stopped = true;
      if (timer.current) clearTimeout(timer.current);
      window.removeEventListener(SYNC_WATCH_EVENT, onWatch);
    };
  }, [router]);

  return null;
}
