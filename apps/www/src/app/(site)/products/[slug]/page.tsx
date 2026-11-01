import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { fetchDefaultOgImageUrl } from "@/lib/case-study-metadata";
import {
  buildProductSocialMetadata,
  productCanonicalPath,
  productLineCanonicalPath,
  resolveProductLineOgImageUrl,
  resolveProductOgImageUrl,
} from "@/lib/catalog/product-metadata";
import { ProductDetailView } from "@/components/product/product-detail-view";
import { ProductLineLanding } from "@/components/product/product-line-landing-view";
import {
  getByProductsSegment,
  listLineStyleParams,
  listProductRelatedIndex,
} from "@/lib/catalog/catalog";
import { staticParamsExceptPreview } from "@/lib/static-params";

export const revalidate = 60;

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams(): Promise<{ slug: string }[]> {
  return staticParamsExceptPreview(async () => {
    // Slim reads: the full line and product lists are too big to cache (PROD-3004).
    const [lines, products] = await Promise.all([
      listLineStyleParams(),
      listProductRelatedIndex(),
    ]);
    return [
      ...lines.map((line) => ({ slug: line.slug })),
      ...products.map((product) => ({ slug: product.slug })),
    ];
  });
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const [result, defaultOgImageUrl] = await Promise.all([
    getByProductsSegment(slug),
    fetchDefaultOgImageUrl(),
  ]);
  if (!result) return { title: "Products" };

  if (result.type === "line") {
    const { line } = result;
    return {
      title: line.title,
      description: line.description,
      ...buildProductSocialMetadata({
        title: line.title,
        description: line.description,
        canonicalPath: productLineCanonicalPath(line),
        ogImageUrl: resolveProductLineOgImageUrl(line, defaultOgImageUrl),
      }),
    };
  }

  const { product } = result;
  return {
    title: product.title,
    description: product.description,
    ...buildProductSocialMetadata({
      title: product.title,
      description: product.description,
      canonicalPath: productCanonicalPath(product),
      ogImageUrl: resolveProductOgImageUrl(product, defaultOgImageUrl),
    }),
  };
}

export default async function ProductsSegmentPage({ params }: PageProps) {
  const { slug } = await params;
  const result = await getByProductsSegment(slug);
  if (!result) notFound();
  if (result.type === "line") {
    return <ProductLineLanding line={result.line} />;
  }
  return <ProductDetailView product={result.product} />;
}
