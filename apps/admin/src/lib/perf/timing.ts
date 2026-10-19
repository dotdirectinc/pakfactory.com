/**
 * Server timing for the admin office (PROD-3116): how long each step of a request's render takes, one
 * log line per measured block — `[timing] layout 1432ms · user 310 · account 95 · specMe 480 · drafts 350`.
 * Runs on the server only; read it in the Vercel runtime logs (or the local dev terminal).
 *
 * Steps that run together are timed separately, so they can add up to more than the total.
 */
export function startTiming(label: string) {
  const t0 = performance.now();
  const steps: string[] = [];
  return {
    /** Time one step; resolves to the step's own result. */
    async step<T>(name: string, work: Promise<T>): Promise<T> {
      const s = performance.now();
      try {
        return await work;
      } finally {
        steps.push(`${name} ${Math.round(performance.now() - s)}`);
      }
    },
    /** Write the line. */
    done() {
      console.info(`[timing] ${label} ${Math.round(performance.now() - t0)}ms · ${steps.join(" · ")}`);
    },
  };
}
