import type { ReactNode } from "react";
import { PageDielineSection } from "@/components/layout/page-dieline-section";

type CategoryLandingLayoutProps = {
  jsonLd: string;
  breadcrumb: ReactNode;
  header: ReactNode;
  children: ReactNode;
};

/**
 * Category archive shell — breadcrumb + document-driven header + fixed sections.
 */
export function CategoryLandingLayout({
  jsonLd,
  breadcrumb,
  header,
  children,
}: CategoryLandingLayoutProps) {
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

/** Shared inner band for category landing sections (Figma dashed container). */
export function CategoryLandingSection({
  children,
  className,
  innerClassName,
}: {
  children: ReactNode;
  className?: string;
  innerClassName?: string;
}) {
  return (
    <section className={className ?? ""}>
      <PageDielineSection innerClassName={innerClassName ?? "py-16 sm:py-24"}>
        {children}
      </PageDielineSection>
    </section>
  );
}
