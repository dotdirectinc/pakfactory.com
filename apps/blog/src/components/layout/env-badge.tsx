/**
 * Floating non-production environment marker. Production renders nothing
 * (layout gates on VERCEL_ENV). pointer-events-none so it never blocks CTAs.
 */
type EnvBadgeProps = {
  label: "Staging" | "Local";
};

export function EnvBadge({ label }: EnvBadgeProps) {
  return (
    <div
      role="status"
      aria-label={`Environment: ${label}`}
      className="pointer-events-none fixed bottom-4 right-4 z-50 rounded-full border border-white/20 bg-black px-2.5 py-1 text-xs font-semibold tracking-wide text-white shadow-md"
    >
      {label}
    </div>
  );
}
