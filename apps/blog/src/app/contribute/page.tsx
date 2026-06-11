import type { Metadata } from "next";
import { ContributeForm } from "@/components/contribute/contribute-form";
import { Breadcrumb } from "@/components/common/breadcrumb";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@pakfactory/ui/components/card";
import { breadcrumbList, jsonLdGraph, serializeJsonLd, webPage } from "@pakfactory/seo";
import { getContributeSubjectOptions } from "@/lib/contribute-options";
import { absoluteUrl } from "@/lib/site";

export const revalidate = 60;

const PAGE_TITLE = "Contribute to the PakFactory Blog";
const PAGE_DESCRIPTION =
  "Pitch original packaging expertise for the PakFactory Blog — trends, sustainability, design, and business strategy for brand and operations leaders.";

export async function generateMetadata(): Promise<Metadata> {
  const canonical = absoluteUrl("/contribute");

  return {
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    robots: { index: true, follow: true },
    alternates: { canonical },
    openGraph: {
      title: PAGE_TITLE,
      description: PAGE_DESCRIPTION,
      url: canonical,
      type: "website",
    },
    twitter: {
      card: "summary",
      title: PAGE_TITLE,
      description: PAGE_DESCRIPTION,
    },
  };
}

const POSITIONING_SECTIONS = [
  {
    title: "What we publish",
    body: [
      "Original analysis and practical guidance on custom packaging, materials, sustainability, design, and supply-chain decisions.",
      "Articles that help brand, operations, and design leaders make better packaging choices — with clear structure, sourced claims, and answer-first intros for search and AI surfaces.",
    ],
  },
  {
    title: "What we don't publish",
    body: [
      "Thin vendor pitches, recycled press releases, or generic listicles without packaging-specific insight.",
      "Content that cannot be supported with credible sources, or pieces that duplicate existing PakFactory articles without a new angle.",
    ],
  },
  {
    title: "Editorial standards",
    body: [
      "Lead with the reader outcome in the first paragraphs; use descriptive headings (H2/H3) and optional FAQ blocks when they aid clarity.",
      "Cite sources for data and regulatory claims; align tone with PakFactory's consultative, expert voice (not hard-sell ecommerce).",
      "Submissions are reviewed by our editorial team — acceptance does not guarantee publication date or format.",
    ],
  },
] as const;

export default function ContributePage() {
  const pageUrl = absoluteUrl("/contribute");
  const jsonLd = serializeJsonLd(
    jsonLdGraph([
      webPage({
        name: PAGE_TITLE,
        url: pageUrl,
        description: PAGE_DESCRIPTION,
      }),
      breadcrumbList([
        { name: "Blog", url: absoluteUrl("/") },
        { name: "Contribute", url: pageUrl },
      ]),
    ]),
  );

  const subjectOptions = getContributeSubjectOptions();

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd }}
      />
      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-8">
          <Breadcrumb items={[{ label: "Blog", href: "/" }, { label: "Contribute" }]} />
          <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">{PAGE_TITLE}</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">{PAGE_DESCRIPTION}</p>
        </div>

        <div className="grid gap-10 lg:grid-cols-2 lg:items-start">
          <div className="flex flex-col gap-6">
            {POSITIONING_SECTIONS.map((section) => (
              <Card key={section.title}>
                <CardHeader>
                  <CardTitle className="text-base tracking-tight">{section.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-muted-foreground">
                  {section.body.map((paragraph) => (
                    <p key={paragraph.slice(0, 40)}>{paragraph}</p>
                  ))}
                </CardContent>
              </Card>
            ))}
            <p className="text-xs text-muted-foreground">
              Positioning copy is a draft for content-team review (PROD-1504).
            </p>
          </div>

          <ContributeForm subjectOptions={subjectOptions} />
        </div>
      </main>
    </>
  );
}
