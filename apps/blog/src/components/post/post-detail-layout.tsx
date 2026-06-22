import type { ReactNode } from "react";
import { PageDielineSection } from "@/components/layout/page-dieline-section";
import { ReadingProgressBar } from "@/components/post/reading-progress-bar";

type PostDetailLayoutProps = {
  breadcrumb: ReactNode;
  header: ReactNode;
  sidebar: ReactNode;
  article: ReactNode;
  footer?: ReactNode;
};

/** Figma `blog_detail-page` shell — breadcrumb, hero header, two-column body, footer bands. */
export function PostDetailLayout({
  breadcrumb,
  header,
  sidebar,
  article,
  footer,
}: PostDetailLayoutProps) {
  return (
    <main>
      <ReadingProgressBar />
      <PageDielineSection innerClassName="py-3">{breadcrumb}</PageDielineSection>
      {header}
      <PageDielineSection innerClassName="py-12 sm:py-16 lg:py-24">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,304px)_minmax(0,1fr)] lg:gap-16">
          <aside className="min-w-0 lg:sticky lg:top-24 lg:self-start">{sidebar}</aside>
          <div className="min-w-0 max-w-[848px]">{article}</div>
        </div>
      </PageDielineSection>
      {footer}
    </main>
  );
}
