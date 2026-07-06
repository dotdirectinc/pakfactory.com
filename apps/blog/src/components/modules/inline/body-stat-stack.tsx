import { cn } from "@pakfactory/ui/lib/utils";
import type { PostBodyStatStack } from "@/lib/blog-post";

type BodyStatStackProps = {
  value: PostBodyStatStack;
};

/** Inline stat callout stack authored in the post body portable text. */
export function BodyStatStack({ value }: BodyStatStackProps) {
  const stats = (value.stats ?? []).filter((s) => s.value?.trim());
  if (stats.length === 0) return null;

  const source = value.source?.trim();
  const cols = stats.length >= 3 ? "sm:grid-cols-3" : "sm:grid-cols-2";

  return (
    <section className="my-8">
      <dl className={cn("grid grid-cols-1 gap-4", cols)}>
        {stats.map((stat, i) => (
          <div
            key={stat._key ?? i}
            className="rounded-lg border-t-2 border-primary bg-muted/40 p-5"
          >
            <dt className="text-3xl font-semibold tracking-tight text-foreground">
              {stat.value}
            </dt>
            {stat.label?.trim() ? (
              <dd className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {stat.label}
              </dd>
            ) : null}
          </div>
        ))}
      </dl>
      {source ? (
        <p className="mt-4 text-xs text-muted-foreground">{source}</p>
      ) : null}
    </section>
  );
}
