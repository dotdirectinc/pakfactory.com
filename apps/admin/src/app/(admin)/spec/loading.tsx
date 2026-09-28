import { Skeleton } from "@pakfactory/ui/components/skeleton";

/** Shown the moment a Spec System link is clicked, while the server builds the view. */
export default function SpecLoading() {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-4" aria-busy="true" aria-label="Loading">
      <Skeleton className="h-7 w-56" />
      <Skeleton className="h-4 w-96 max-w-full" />
      <Skeleton className="h-9 w-80 max-w-full" />
      <div className="flex flex-col gap-2">
        {Array.from({ length: 8 }, (_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    </div>
  );
}
