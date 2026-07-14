import type { Metadata } from "next";
import { BlockRenderer } from "@/components/blocks/block-renderer";
import { ContributeForm } from "@/components/modules/contribute-form";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { PageHeader } from "@/components/modules/page-header";
import { PageDielineSection } from "@/components/layout/page-dieline-section";
import { JsonLdScript } from "@/components/ui/json-ld-script";
import {
  buildBlogContributeMetadata,
  fetchBlogContributePage,
  resolveContributePageDescription,
  resolveContributePageTitle,
} from "@/lib/blog-contribute-page";
import { buildWebPageJsonLd } from "@/lib/blog-jsonld";
import { absoluteUrl } from "@/lib/site";

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  const page = await fetchBlogContributePage();
  return buildBlogContributeMetadata(page, { index: true, follow: true });
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

export default async function ContributePage() {
  const page = await fetchBlogContributePage();
  const pageTitle = resolveContributePageTitle(page);
  const pageDescription = resolveContributePageDescription(page);
  const blocks = page?.pageBuilder ?? [];
  const pageUrl = absoluteUrl("/contribute");
  const jsonLd = buildWebPageJsonLd({
    name: pageTitle,
    url: pageUrl,
    description: pageDescription,
    crumbLabel: "Contribute",
  });

  return (
    <>
      <JsonLdScript jsonLd={jsonLd} />
      <main>
        <PageDielineSection innerClassName="py-4">
          <Breadcrumb items={[{ label: "Blog", href: "/" }, { label: "Contribute" }]} />
        </PageDielineSection>

        <PageHeader title={pageTitle} descriptionText={pageDescription} />

        <PageDielineSection innerClassName="py-16">
          {/*
            Mobile: form first, positioning second (DOM order).
            Desktop (lg+): positioning left (col 1), form right (col 2) via col-start.
          */}
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:items-start lg:gap-16">
            <div className="lg:col-start-2 lg:row-start-1">
              <ContributeForm />
            </div>
            <div className="lg:col-start-1 lg:row-start-1">
              <ContributePositioning />
            </div>
          </div>
        </PageDielineSection>

        {blocks.length > 0 ? <BlockRenderer blocks={blocks} /> : null}
      </main>
    </>
  );
}
