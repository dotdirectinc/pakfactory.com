import { Breadcrumb } from "@/components/breadcrumb";
import { ArchiveFilterSidebar } from "@/app/all/_components/filter-sidebar";
import { Pagination } from "@/components/pagination";
import { PostCard } from "@/components/post/post-card";
import { buildAllArchiveJsonLd } from "@/lib/all-archive-jsonld";
import { archivePageHref, type AllArchivePageData } from "@/lib/blog-archive";
import { fetchBlogCategories } from "@/lib/blog-data";

type AllPostsArchiveProps = {
  data: AllArchivePageData;
};

export async function AllPostsArchive({ data }: AllPostsArchiveProps) {
  const categories = await fetchBlogCategories();
  const jsonLd = buildAllArchiveJsonLd(data.posts, data.pageNumber);
  const heading =
    data.pageNumber > 1
      ? `All posts — Page ${data.pageNumber}`
      : "All posts";

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd }}
      />
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-8">
          <Breadcrumb items={[{ label: "Blog", href: "/" }, { label: "All posts" }]} />
          <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            {heading}
          </h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Every published article, newest first.
            {data.totalCount > 0 && (
              <span className="text-foreground"> {data.totalCount} posts total.</span>
            )}
          </p>
        </div>

        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_220px]">
          <div>
            {data.posts.length === 0 ? (
              <p className="text-muted-foreground">No published posts yet.</p>
            ) : (
              <ul className="grid gap-8 sm:grid-cols-2">
                {data.posts.map((post) => (
                  <li key={post._id}>
                    <PostCard post={post} />
                  </li>
                ))}
              </ul>
            )}
            <Pagination
              pageNumber={data.pageNumber}
              totalPages={data.totalPages}
              hrefForPage={(page) => archivePageHref(page)}
              ariaLabel="Archive pagination"
            />
          </div>
          <ArchiveFilterSidebar categories={categories} />
        </div>
      </div>
    </>
  );
}
