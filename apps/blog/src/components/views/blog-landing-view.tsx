import Link from "next/link";
import { pageDielineOuterClass } from "@/components/layout/page-dieline-section";
import { BlockRenderer } from "@/components/blocks/block-renderer";
import { JsonLdScript } from "@/components/ui/json-ld-script";
import type { BlogPageRecord } from "@/lib/blog-page";
import { buildWebPageJsonLd } from "@/lib/blog-jsonld";
import { absoluteUrl } from "@/lib/site";

type BlogLandingViewProps = {
  page: BlogPageRecord;
};

export function BlogLandingView({ page }: BlogLandingViewProps) {
  const blocks = page.pageBuilder ?? [];
  const url = absoluteUrl(`/${page.slug}`);

  const jsonLd = buildWebPageJsonLd({
    name: page.title,
    url,
    description: page.metaDescription?.trim() || undefined,
  });

  return (
    <>
      <JsonLdScript jsonLd={jsonLd} />
      <main className={pageDielineOuterClass()}>
        <div className="mx-auto max-w-6xl px-6 pt-8">
          <nav className="text-sm text-muted-foreground">
            <Link href="/" className="hover:text-foreground">
              Blog
            </Link>
            <span className="mx-2">/</span>
            <span className="text-foreground">{page.title}</span>
          </nav>
        </div>
        <BlockRenderer blocks={blocks} />
      </main>
    </>
  );
}
