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
import { fetchBlogHomeData } from "@/lib/blog-home";
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
