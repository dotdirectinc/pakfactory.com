import type { Metadata } from "next";
import {
  blog,
  jsonLdGraph,
  organization,
  serializeJsonLd,
} from "@pakfactory/seo";
import { HomeCategoryRowSection } from "@/app/_components/home-category-row";
import { HomeConversionPillars } from "@/app/_components/home-conversion-pillars";
import { HomeHero } from "@/app/_components/home-hero";
import { HomeIndustryStrip } from "@/app/_components/home-industry-strip";
import { GlobalRfqCta } from "@/app/_components/global-rfq-cta";
import { NewsletterCtaBand } from "@/app/_components/newsletter-cta-band";
import { fetchBlogHomeData, getBlogHomeDebugInfo } from "@/lib/blog-home";
import {
  getListingRobotsFromSearchParams,
  robotsDirectiveToMetadata,
} from "@/lib/seo";
import { getSiteUrl, normalizeSiteUrl } from "@/lib/site";

export const revalidate = 60;

const HOME_TITLE = "PakFactory Blog — Packaging Insights, Trends & Industry News";
const HOME_DESCRIPTION =
  "Curated packaging insights across trends, sustainability, business strategy, design, and industry news from PakFactory.";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> {
  const sp = await searchParams;
  const directive = getListingRobotsFromSearchParams("blog_index", sp);

  return {
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
    robots: robotsDirectiveToMetadata(directive),
    openGraph: {
      title: HOME_TITLE,
      description: HOME_DESCRIPTION,
      type: "website",
    },
    twitter: {
      card: "summary",
      title: HOME_TITLE,
      description: HOME_DESCRIPTION,
    },
  };
}

export default async function BlogHomePage() {
  const data = await fetchBlogHomeData();
  const debug = getBlogHomeDebugInfo();
  const postCount =
    (data.featured ? 1 : 0) +
    data.latest.length +
    data.categoryRows.reduce((n, row) => n + row.posts.length, 0);
  const showDevEmptyHint =
    process.env.NODE_ENV === "development" && postCount === 0;
  const siteUrl = normalizeSiteUrl(getSiteUrl());
  const orgId = `${siteUrl}#organization`;
  const blogId = `${siteUrl}#blog`;

  const jsonLd = jsonLdGraph([
    organization({
      name: "PakFactory",
      url: siteUrl.replace(/\/blog\/?$/, "") || siteUrl,
      id: orgId,
    }),
    blog({
      name: "PakFactory Blog",
      url: siteUrl,
      description: HOME_DESCRIPTION,
      id: blogId,
      publisher: { "@id": orgId },
    }),
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
      />
      <main className="mx-auto max-w-6xl px-6 py-10">
        <header className="mb-10">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            PakFactory Blog
          </h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">{HOME_DESCRIPTION}</p>
        </header>

        {showDevEmptyHint && (
          <div
            className="mb-8 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-950 dark:text-amber-100"
            role="status"
          >
            <p className="font-medium">No posts loaded from Sanity</p>
            <p className="mt-1 text-muted-foreground">
              Project: <code>{debug.projectId}</code> · Dataset:{" "}
              <code>{debug.dataset}</code> · Token:{" "}
              {debug.hasReadToken ? "set" : "missing"} · Configured:{" "}
              {debug.configured ? "yes" : "no"}
            </p>
            <p className="mt-2 text-muted-foreground">
              Use <strong>http://localhost:3003/blog</strong> (not :3001). After
              changing <code>.env.local</code>, stop the dev server, run{" "}
              <code>rm -rf apps/blog/.next</code>, then <code>pnpm dev:blog</code>.
              Seed data: <code>pnpm seed:blog-dev</code> on dataset{" "}
              <code>development</code>.
            </p>
          </div>
        )}

        <HomeHero featured={data.featured} latest={data.latest} />
        <HomeIndustryStrip industries={data.industries} />
        {data.categoryRows.map((row) => (
          <HomeCategoryRowSection key={row.slug} row={row} />
        ))}
        <NewsletterCtaBand className="border-t py-10" />
        <HomeConversionPillars />
        <GlobalRfqCta className="pb-10" />
      </main>
    </>
  );
}
