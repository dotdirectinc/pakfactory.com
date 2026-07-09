"use client";
import { Suspense } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS } from "@/lib/blog-category-archive";

function PerPageSelectInner({ currentPerPage = DEFAULT_PAGE_SIZE }: { currentPerPage?: number }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const size = Number(e.target.value);
    const params = new URLSearchParams(searchParams.toString());
    params.delete("page");
    if (size === DEFAULT_PAGE_SIZE) {
      params.delete("perPage");
    } else {
      params.set("perPage", String(size));
    }
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  return (
    <select
      value={String(currentPerPage)}
      onChange={handleChange}
      aria-label="Posts per page"
      className="cursor-pointer bg-transparent text-sm text-muted-foreground outline-none hover:text-foreground"
    >
      {PAGE_SIZE_OPTIONS.map((size) => (
        <option key={size} value={String(size)}>
          {size}/page
        </option>
      ))}
    </select>
  );
}

export function PerPageSelect(props: { currentPerPage?: number }) {
  return (
    <Suspense>
      <PerPageSelectInner {...props} />
    </Suspense>
  );
}
