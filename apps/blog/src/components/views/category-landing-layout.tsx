import type { ReactNode } from "react";
import { PageDielineSection } from "@/components/layout/page-dieline-section";

type CategoryLandingLayoutProps = {
  jsonLd: string;
  breadcrumb: ReactNode;
  header: ReactNode;
  featured?: ReactNode;
  listing: ReactNode;
  cta?: ReactNode;
};

/**
 * Figma `blog_category` page shell — dieline column aligned with SiteNav/footer.
 * Phase 1: composes section slots; Phase 2 wires CMS data into each slot.
 */
export function CategoryLandingLayout({
  jsonLd,
  breadcrumb,
  header,
  featured,
  listing,
  cta,
}: CategoryLandingLayoutProps) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd }}
      />
      <main>
        <PageDielineSection innerClassName="py-3">{breadcrumb}</PageDielineSection>
        {header}
        {featured}
        {listing}
        {cta ? (
          <div className="border-b border-dashed border-border">
            <PageDielineSection innerClassName="py-16 sm:py-24">
              {cta}
            </PageDielineSection>
          </div>
        ) : null}
      </main>
    </>
  );
}

/** Shared inner band for featured + listing sections (Figma dashed container). */
export function CategoryLandingSection({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`border-b border-dashed border-border ${className ?? ""}`}
    >
      <PageDielineSection innerClassName="py-16 sm:py-24">
        {children}
      </PageDielineSection>
    </section>
  );
}
