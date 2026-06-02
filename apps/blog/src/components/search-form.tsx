import { Input } from "@pakfactory/ui/components/input";
import { Button } from "@pakfactory/ui/components/button";

type SearchFormProps = {
  defaultQuery?: string;
  className?: string;
};

/** Inline GET search — targets `/search` (PROD-1503). Reuse on 404 and zero-results. */
export function SearchForm({ defaultQuery = "", className }: SearchFormProps) {
  return (
    <form action="/search" method="get" className={className}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <label htmlFor="blog-search-q" className="sr-only">
          Search the blog
        </label>
        <Input
          id="blog-search-q"
          name="q"
          type="search"
          placeholder="Search articles…"
          defaultValue={defaultQuery}
          className="min-w-0 flex-1"
        />
        <Button type="submit">Search</Button>
      </div>
    </form>
  );
}
