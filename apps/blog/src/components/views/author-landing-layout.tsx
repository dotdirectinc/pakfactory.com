import type { ReactNode } from "react";
import { PageDielineSection } from "@/components/layout/page-dieline-section";
import { JsonLdScript } from "@/components/ui/json-ld-script";

type AuthorLandingLayoutProps = {
  jsonLd: string;
  breadcrumb: ReactNode;
  header: ReactNode;
  children: ReactNode;
};

/**
 * Author archive shell — breadcrumb + profile header + fixed sections.
 */
export function AuthorLandingLayout({
  jsonLd,
  breadcrumb,
  header,
  children,
}: AuthorLandingLayoutProps) {
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

/** Shared inner band for author archive sections (Figma dashed container). */
export function AuthorLandingSection({
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
