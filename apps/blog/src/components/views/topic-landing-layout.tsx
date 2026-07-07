import type { ReactNode } from "react";
import { PageDielineSection } from "@/components/layout/page-dieline-section";

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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd }}
      />
      <main>
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
      <PageDielineSection innerClassName="py-16 sm:py-24">
        {children}
      </PageDielineSection>
    </section>
  );
}
