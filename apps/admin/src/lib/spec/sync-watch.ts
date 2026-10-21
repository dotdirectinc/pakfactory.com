/**
 * The sync run this browser tab is waiting on (2026-10-21: a finished sync gave no sign). Whoever
 * starts a run calls watchSyncRun; the shell's SyncRunWatcher follows it from any page and survives
 * a reload (sessionStorage). Client-only.
 */
export const SYNC_WATCH_KEY = "spec.sync.watching";
export const SYNC_WATCH_EVENT = "spec-sync-watch";

export function watchSyncRun(id: string) {
  try {
    sessionStorage.setItem(SYNC_WATCH_KEY, JSON.stringify({ id, since: Date.now() }));
  } catch {
    // storage blocked: the event below still reaches the watcher on this page
  }
  window.dispatchEvent(new CustomEvent(SYNC_WATCH_EVENT, { detail: { id, since: Date.now() } }));
}
