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
      <PageDielineSection innerClassName="py-4">{breadcrumb}</PageDielineSection>
      {header}
      <PageDielineSection innerClassName="py-12 sm:py-16 lg:py-24">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,304px)_minmax(0,1fr)] lg:gap-16">
          {/* Hidden below lg (author/share/Ask AI move to the article foot);
              on desktop it stretches to the row height so the sidebar can make
              just its lower part (TOC → Ask AI) sticky while the author scrolls. */}
          <aside className="hidden min-w-0 lg:block">{sidebar}</aside>
          <div className="min-w-0 max-w-[848px]">{article}</div>
        </div>
      </PageDielineSection>
      {footer}
    </main>
  );
}
