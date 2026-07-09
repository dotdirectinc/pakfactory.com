import type { Metadata } from "next";
import Link from "next/link";
import { CircleCheckBig } from "lucide-react";
import { Button } from "@pakfactory/ui/components/button";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { PageHeader } from "@/components/modules/page-header";
import { PageDielineSection } from "@/components/layout/page-dieline-section";
import { WidgetNewsletter } from "@/components/modules/widget/widget-newsletter";
import { breadcrumbList, jsonLdGraph, serializeJsonLd, webPage } from "@pakfactory/seo";
import { robotsDirectiveToMetadata } from "@/lib/seo";
import { absoluteUrl } from "@/lib/site";

const PAGE_TITLE = "Contribute to Our Blog";
const PAGE_DESCRIPTION =
  "Write for the PakFactory blog. We publish guest articles for the people who specify, design, and source custom packaging — brand owners, designers, and packaging teams. Pitch your idea below.";

export async function generateMetadata(): Promise<Metadata> {
  const canonical = absoluteUrl("/contribute/thank-you");

  return {
    title: "Pitch received — PakFactory Blog",
    description: PAGE_DESCRIPTION,
    robots: robotsDirectiveToMetadata({ index: false, follow: true }),
    alternates: { canonical },
  };
}

export default function ContributeThankYouPage() {
  const pageUrl = absoluteUrl("/contribute/thank-you");
  const jsonLd = serializeJsonLd(
    jsonLdGraph([
      webPage({
        name: "Pitch received — PakFactory Blog",
        url: pageUrl,
        description: PAGE_DESCRIPTION,
      }),
      breadcrumbList([
        { name: "Blog", url: absoluteUrl("/") },
        { name: "Contribute", url: absoluteUrl("/contribute") },
        { name: "Thank you", url: pageUrl },
      ]),
    ]),
  );

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd }}
      />
      <main>
        <PageDielineSection innerClassName="py-4">
          <Breadcrumb
            items={[
              { label: "Blog", href: "/" },
              { label: "Contribute", href: "/contribute" },
              { label: "Thank you" },
            ]}
          />
        </PageDielineSection>

        <PageHeader title={PAGE_TITLE} descriptionText={PAGE_DESCRIPTION} />

        <PageDielineSection innerClassName="py-16">
          <div className="mx-auto flex max-w-[560px] flex-col items-center gap-4 rounded-2xl border border-border bg-background px-8 py-16 text-center">
            <CircleCheckBig
              className="size-10 text-foreground"
              strokeWidth={1.5}
            />
            <h2 className="text-2xl font-semibold tracking-tight">
              Pitch received — thank you
            </h2>
            <p className="max-w-[420px] text-base leading-7 text-muted-foreground">
              We read every pitch and reply within 5 business days. Keep an eye
              on your inbox, and your spam folder, just in case.
            </p>
            <div className="mt-2">
              <Button variant="outline" asChild>
                <Link href="/">← Back to the blog</Link>
              </Button>
            </div>
          </div>
        </PageDielineSection>

        <WidgetNewsletter />
      </main>
    </>
  );
}
