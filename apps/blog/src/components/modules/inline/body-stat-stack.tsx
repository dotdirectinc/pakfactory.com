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
    <figure className="my-8">
      <div className="rounded-3xl bg-muted p-8 sm:p-10">
        <dl className={cn("grid grid-cols-1 gap-8", cols)}>
          {stats.map((stat, i) => (
            <div key={stat._key ?? i}>
              <div className="mb-4 h-1 w-[75px] rounded-full bg-primary" />
              <dt className="text-[40px] font-bold leading-none tracking-tight text-foreground">
                {stat.value}
              </dt>
              {stat.label?.trim() ? (
                <dd className="mt-3 text-base leading-relaxed text-muted-foreground">
                  {stat.label}
                </dd>
              ) : null}
            </div>
          ))}
        </dl>
      </div>
      {source ? (
        <figcaption className="mt-3 text-sm text-muted-foreground">
          {source}
        </figcaption>
      ) : null}
    </figure>
  );
}
