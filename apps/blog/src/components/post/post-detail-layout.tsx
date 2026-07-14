import type { ReactNode } from "react";
import {
  PageDielineSection,
  pageDielineOuterClass,
} from "@/components/layout/page-dieline-section";
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
    // overflow-x-clip is a safety net against full-bleed rows; it does not
    // create a scroll container, so the sticky sidebar is unaffected.
    <main className="overflow-x-clip">
      <ReadingProgressBar />
      <PageDielineSection innerClassName="py-4">{breadcrumb}</PageDielineSection>
      {header}
      {/* px-0 overrides the dieline's default px-8 so sidebar/article control
          their own horizontal padding (pl-6/pr-8 and px-32 respectively). */}
      <PageDielineSection innerClassName="grid grid-cols-1 gap-0 px-0 pt-12 lg:grid-cols-[280px_1fr] lg:pt-24">
        {/* Hidden below lg; on desktop stretches to row height for the sticky sidebar. */}
        <aside className="hidden min-w-0 lg:block">{sidebar}</aside>
        <div className="min-w-0 px-6 pb-24 lg:px-32">{article}</div>
      </PageDielineSection>
      {/* Footer bands use the full-bleed row helper, which is designed to break
          out of the page gutter — give it that gutter so the negative margins
          cancel instead of overflowing the viewport. */}
      {footer ? (
        <div className={pageDielineOuterClass()}>{footer}</div>
      ) : null}
    </main>
  );
}
