"use client";

import { useMemo, useState } from "react";
import { ChevronDown, Search, SlidersHorizontal } from "lucide-react";
import { Button } from "@pakfactory/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@pakfactory/ui/components/dropdown-menu";
import { Input } from "@pakfactory/ui/components/input";
import { Checkbox } from "@pakfactory/ui/components/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@pakfactory/ui/components/select";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@pakfactory/ui/components/sheet";
import { cn } from "@pakfactory/ui/lib/utils";
import type { CaseStudyCard } from "@pakfactory/sanity/queries";
import { CaseStudyCard as CaseStudyCardComponent } from "@/components/modules/case-study-card";
import { Pagination } from "@pakfactory/components/modules/pagination";

const PAGE_SIZES = [9, 18, 36];

// ─── Types ────────────────────────────────────────────────────────────────────

type FilterOption = { _id: string; title: string };

type Props = {
  studies: CaseStudyCard[];
};

// ─── Derive filter options from actual case study data ────────────────────────

function deriveOptions(
  studies: CaseStudyCard[],
  key: "solutions" | "products" | "expertiseAreas",
): FilterOption[] {
  const seen = new Map<string, FilterOption>();
  for (const s of studies) {
    for (const item of s[key] ?? []) {
      if (!seen.has(item._id)) seen.set(item._id, { _id: item._id, title: item.title });
    }
  }
  return Array.from(seen.values()).sort((a, b) => a.title.localeCompare(b.title));
}

// ─── TagDropdown ──────────────────────────────────────────────────────────────

function TagDropdown({
  label,
  options,
  values,
  onChange,
}: {
  label: string;
  options: FilterOption[];
  values: string[];
  onChange: (next: string[]) => void;
}) {
  const toggle = (id: string, checked: boolean) => {
    onChange(checked ? [...values, id] : values.filter((v) => v !== id));
  };

  const active = values.length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex h-9 items-center gap-1.5 rounded-full border px-4 text-sm font-medium transition-colors",
            active > 0
              ? "border-foreground bg-foreground text-background"
              : "border-border bg-background text-foreground hover:bg-muted/50",
          )}
        >
          {label}
          {active > 0 && (
            <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-background px-1 text-[10px] font-semibold leading-none text-foreground">
              {active}
            </span>
          )}
          <ChevronDown className="size-3.5 text-muted-foreground" strokeWidth={1.75} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-72 min-w-[200px] overflow-y-auto">
        {options.map((opt) => {
          const isChecked = values.includes(opt._id);
          return (
            <DropdownMenuItem
              key={opt._id}
              onSelect={(e) => {
                e.preventDefault();
                toggle(opt._id, !isChecked);
              }}
              className={cn("cursor-pointer px-3", isChecked && "font-medium")}
            >
              {opt.title}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ─── Mobile FilterSection ─────────────────────────────────────────────────────

function FilterSection({
  title,
  options,
  values,
  onChange,
}: {
  title: string;
  options: FilterOption[];
  values: string[];
  onChange: (next: string[]) => void;
}) {
  const [open, setOpen] = useState(true);

  const toggle = (id: string, checked: boolean) => {
    onChange(checked ? [...values, id] : values.filter((v) => v !== id));
  };

  return (
    <div className="border-b border-dashed border-border">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between px-6 py-4 text-lg font-semibold text-foreground"
      >
        {title}
        <ChevronDown
          className={cn(
            "size-5 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
          strokeWidth={1.75}
        />
      </button>
      {open && (
        <div className="flex flex-col gap-3 px-6 pb-5">
          {options.map((opt) => {
            const id = `mobile-filter-${title}-${opt._id}`;
            return (
              <label
                key={opt._id}
                htmlFor={id}
                className="flex cursor-pointer items-center gap-3 text-base leading-6 text-foreground"
              >
                <Checkbox
                  id={id}
                  checked={values.includes(opt._id)}
                  onCheckedChange={(c) => toggle(opt._id, c === true)}
                />
                {opt.title}
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function CaseStudyListingGrid({ studies }: Props) {
  const solutionOptions = useMemo(() => deriveOptions(studies, "solutions"), [studies]);
  const productOptions = useMemo(() => deriveOptions(studies, "products"), [studies]);
  const expertiseOptions = useMemo(() => deriveOptions(studies, "expertiseAreas"), [studies]);

  const [solutions, setSolutions] = useState<string[]>([]);
  const [products, setProducts] = useState<string[]>([]);
  const [expertises, setExpertises] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [pageSize, setPageSize] = useState<number>(PAGE_SIZES[0] ?? 9);
  const [page, setPage] = useState(1);

  // Reset to page 1 whenever a filter changes
  const updateAndReset =
    <T,>(setter: (v: T) => void) =>
    (next: T) => {
      setter(next);
      setPage(1);
    };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return studies.filter((s) => {
      if (solutions.length && !s.solutions?.some((t) => solutions.includes(t._id))) return false;
      if (products.length && !s.products?.some((t) => products.includes(t._id))) return false;
      if (expertises.length && !s.expertiseAreas?.some((t) => expertises.includes(t._id))) return false;
      if (q) {
        const haystack = [
          s.client?.name ?? "",
          s.title,
          ...(s.solutions?.map((t) => t.title) ?? []),
          ...(s.products?.map((t) => t.title) ?? []),
          ...(s.expertiseAreas?.map((t) => t.title) ?? []),
        ]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [studies, solutions, products, expertises, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const visible = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  const clearFilters = () => {
    setSolutions([]);
    setProducts([]);
    setExpertises([]);
    setQuery("");
    setPage(1);
  };

  const activeFilterCount = solutions.length + products.length + expertises.length;
  const hasActiveFilters = activeFilterCount > 0 || query.length > 0;

  return (
    <>
      {/* Filter bar */}
      <section className="sticky top-16 z-30 border-b border-dashed border-border bg-background">
        <div className="mx-auto w-full max-w-[var(--layout-max)] border-x border-dashed border-border px-8">
          <div className="flex flex-wrap items-center justify-between gap-4 py-8">
            {/* Desktop filters */}
            {(solutionOptions.length > 0 || productOptions.length > 0 || expertiseOptions.length > 0) && (
              <div className="hidden flex-wrap items-center gap-3 lg:flex">
                <span className="text-base font-medium text-foreground">Filter by</span>
                {solutionOptions.length > 0 && (
                  <TagDropdown
                    label="Solutions"
                    options={solutionOptions}
                    values={solutions}
                    onChange={updateAndReset(setSolutions)}
                  />
                )}
                {productOptions.length > 0 && (
                  <TagDropdown
                    label="Product"
                    options={productOptions}
                    values={products}
                    onChange={updateAndReset(setProducts)}
                  />
                )}
                {expertiseOptions.length > 0 && (
                  <TagDropdown
                    label="Expertise"
                    options={expertiseOptions}
                    values={expertises}
                    onChange={updateAndReset(setExpertises)}
                  />
                )}
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="text-sm font-medium text-foreground/80 underline-offset-4 transition-colors hover:text-foreground hover:underline"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            )}

            {/* Mobile filter trigger */}
            <Sheet>
              <SheetTrigger asChild>
                <button
                  type="button"
                  className="inline-flex h-10 items-center gap-2 rounded-full border border-border bg-background px-4 text-sm font-medium text-foreground shadow-xs lg:hidden"
                >
                  <SlidersHorizontal className="size-4" strokeWidth={1.75} />
                  Filter
                  {activeFilterCount > 0 && (
                    <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-medium leading-none text-primary-foreground">
                      {activeFilterCount}
                    </span>
                  )}
                </button>
              </SheetTrigger>
              <SheetContent side="right" className="flex w-full max-w-[400px] flex-col p-0">
                <SheetHeader className="border-b border-dashed border-border px-6 py-5">
                  <SheetTitle className="text-2xl font-semibold leading-8 text-foreground">
                    Filter
                  </SheetTitle>
                </SheetHeader>
                <div className="flex-1 overflow-y-auto">
                  {solutionOptions.length > 0 && (
                    <FilterSection
                      title="Solution"
                      options={solutionOptions}
                      values={solutions}
                      onChange={updateAndReset(setSolutions)}
                    />
                  )}
                  {productOptions.length > 0 && (
                    <FilterSection
                      title="Product"
                      options={productOptions}
                      values={products}
                      onChange={updateAndReset(setProducts)}
                    />
                  )}
                  {expertiseOptions.length > 0 && (
                    <FilterSection
                      title="Expertise"
                      options={expertiseOptions}
                      values={expertises}
                      onChange={updateAndReset(setExpertises)}
                    />
                  )}
                </div>
                <div className="flex items-center gap-3 border-t border-dashed border-border px-6 py-5">
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="inline-flex h-11 flex-1 items-center justify-center rounded-full border border-border bg-background text-base font-medium text-foreground transition-colors hover:bg-muted"
                  >
                    Clear
                  </button>
                  <SheetClose asChild>
                    <button
                      type="button"
                      className="inline-flex h-11 flex-1 items-center justify-center rounded-full bg-primary text-base font-medium text-primary-foreground shadow-xs transition-colors hover:bg-primary/90"
                    >
                      Done
                    </button>
                  </SheetClose>
                </div>
              </SheetContent>
            </Sheet>

            {/* Search */}
            <div className="relative w-full max-w-[328px]">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                strokeWidth={1.75}
              />
              <Input
                type="search"
                placeholder="Search case studies"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(1);
                }}
                className="h-10 rounded-full border border-border bg-background pl-9 text-sm"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Results grid */}
      <section className="bg-background">
        <div className="mx-auto w-full max-w-[var(--layout-max)] border-x border-dashed border-border px-8">
          <div className="flex flex-col gap-10 py-12">
            {visible.length === 0 ? (
              <div className="flex h-64 flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border bg-muted/50 text-center">
                <p className="text-base font-medium text-foreground">
                  No case studies match those filters.
                </p>
                <p className="text-sm text-muted-foreground">
                  Try clearing a filter or adjusting the search.
                </p>
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="mt-2 text-sm font-medium text-primary underline-offset-4 hover:underline"
                  >
                    Clear all filters
                  </button>
                )}
              </div>
            ) : (
              <ul className="grid grid-cols-1 gap-x-[60px] gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
                {visible.map((study, i) => (
                  <li key={study._id}>
                    <CaseStudyCardComponent
                      href={`/case-studies/${study.slug}`}
                      title={study.title}
                      clientName={study.client?.name}
                      cardImageUrl={study.cardImageUrl}
                      cardImageAlt={study.cardImageAlt}
                      solutions={study.solutions}
                      products={study.products}
                      priority={i < 3}
                    />
                  </li>
                ))}
              </ul>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="border-t border-dashed border-border px-4 md:px-8">
                <Pagination
                  pageNumber={page}
                  totalPages={totalPages}
                  onPageChange={(p: number) => setPage(p)}
                  rightSlot={
                    <Select
                      value={String(pageSize)}
                      onValueChange={(v) => {
                        setPageSize(Number(v));
                        setPage(1);
                      }}
                    >
                      <SelectTrigger className="h-8 w-[100px] text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent align="end">
                        {PAGE_SIZES.map((n) => (
                          <SelectItem key={n} value={String(n)}>
                            {n} / page
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  }
                />
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
