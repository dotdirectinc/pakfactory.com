import type { ReactNode } from "react";
import { PageDielineSection } from "@/components/layout/page-dieline-section";
import { JsonLdScript } from "@/components/ui/json-ld-script";

type TopicLandingLayoutProps = {
  jsonLd: string;
  breadcrumb: ReactNode;
  header: ReactNode;
  children: ReactNode;
};

/**
 * Topic archive shell — breadcrumb + document-driven header + fixed sections.
 */
export function TopicLandingLayout({
  jsonLd,
  breadcrumb,
  header,
  children,
}: TopicLandingLayoutProps) {
  return (
    <>
      <JsonLdScript jsonLd={jsonLd} />
      <main className="overflow-x-clip">
        <PageDielineSection innerClassName="py-4">{breadcrumb}</PageDielineSection>
        {header}
        {children}
      </main>
    </>
  );
}

/** Shared inner band for topic archive sections (Figma dashed container). */
export function TopicLandingSection({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={className ?? ""}>
      <PageDielineSection innerClassName="py-8 sm:py-24">
        {children}
      </PageDielineSection>
    </section>
  );
}
