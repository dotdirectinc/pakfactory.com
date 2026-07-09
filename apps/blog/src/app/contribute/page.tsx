import type { Metadata } from "next";
import { ContributeForm } from "@/components/modules/contribute-form";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { breadcrumbList, jsonLdGraph, serializeJsonLd, webPage } from "@pakfactory/seo";
import { getContributeSubjectOptions } from "@/lib/contribute-options";
import { robotsDirectiveToMetadata } from "@/lib/seo";
import { absoluteUrl } from "@/lib/site";

export const revalidate = 60;

const PAGE_TITLE = "Contribute to Our Blog";
const PAGE_DESCRIPTION =
  "Write for the PakFactory blog. We publish guest articles for the people who specify, design, and source custom packaging — brand owners, designers, and packaging teams. Pitch your idea below.";

export async function generateMetadata(): Promise<Metadata> {
  const canonical = absoluteUrl("/contribute");

  return {
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    robots: robotsDirectiveToMetadata({ index: true, follow: true }),
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

function ContributePositioning() {
  return (
    <div className="space-y-6 text-muted-foreground">
      <div>
        <h2 className="mb-3 text-xl font-semibold tracking-tight text-foreground">
          What we publish
        </h2>
        <p>
          Practical, experience-based articles for packaging buyers and brand teams. We cover the
          full arc of custom packaging — from design, materials, and finishes to sustainability,
          compliance, cost and sourcing, and branding. If your idea sits anywhere in packaging and
          teaches the reader something useful, we&apos;re open to it.
        </p>
      </div>
      <div>
        <p>
          The strongest pitches share something you&apos;ve learned firsthand — a how-to, a lesson
          from a real project, or original research and data — backed by evidence, not opinion
          alone. Academic and applied research is welcome, as long as it&apos;s written to be
          useful for practitioners, not just other researchers. We don&apos;t publish disguised
          product pitches, or AI-written, unverified drafts (AI-assisted is fine).
        </p>
      </div>
    </div>
  );
}

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
        <div className="mb-10">
          <Breadcrumb items={[{ label: "Blog", href: "/" }, { label: "Contribute" }]} />
          <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">{PAGE_TITLE}</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">{PAGE_DESCRIPTION}</p>
        </div>

        {/*
          Mobile: form first, positioning second (DOM order).
          Desktop (lg+): positioning left (col 1), form right (col 2) via col-start.
        */}
        <div className="grid gap-10 lg:grid-cols-[2fr_3fr] lg:items-start">
          <div className="lg:col-start-2 lg:row-start-1">
            <ContributeForm subjectOptions={subjectOptions} />
          </div>
          <div className="lg:col-start-1 lg:row-start-1">
            <ContributePositioning />
          </div>
        </div>
      </main>
    </>
  );
}
