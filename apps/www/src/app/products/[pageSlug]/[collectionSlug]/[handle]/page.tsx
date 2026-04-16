import type { PortableTextBlock } from "@portabletext/types";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublishedSanityClient, getSanityClient, urlFor } from "@/sanity/client";
import { isSanityConfigured } from "@/sanity/env";
import { plainTextFromBlocks } from "@/lib/portable-text";
import {
  CAPABILITIES_FOR_PRODUCT_REFS_QUERY,
  PRODUCT_BY_PATH_QUERY,
  PRODUCT_PATHS_QUERY,
} from "@pakfactory/sanity/queries";
import { normalizeHandle, normalizeSegment } from "../../../path-utils";
import ProductOverview from "@/components/products/product-overview";

export const revalidate = 60;

type ProductMediaItem = {
  _type?: string;
  asset?: { _ref?: string } | null;
  alt?: string | null;
};

type CapabilityRef = {
  _id: string;
  title: string;
  slug: string;
};

type ProductByPath = {
  _id: string;
  title: string;
  handle: string;
  description?: PortableTextBlock[];
  media?: ProductMediaItem[];
  seo?: {
    metaTitle?: string;
    metaDescription?: string;
    ogImage?: ProductMediaItem;
  };
  primaryLandingPage?: {
    _type: string;
    title: string;
    slug: string;
  };
  primaryCollection?: {
    _id: string;
    title: string;
    slug: string;
    defaultCapabilities?: CapabilityRef[];
  };
  landingPageId?: string | null;
  collectionId?: string | null;
};

type CapabilityRow = {
  _id: string;
  title: string;
  slug: string;
  category: "material" | "finish" | null;
};

const CATEGORY_TITLE: Record<"material" | "finish", string> = {
  material: "Material",
  finish: "Finish",
};

export async function generateStaticParams(): Promise<
  { pageSlug: string; collectionSlug: string; handle: string }[]
> {
  if (!isSanityConfigured()) return [];
  const client = getPublishedSanityClient();
  const rows = await client
    .fetch<{ pageSlug: string; collectionSlug: string; handle: string }[] | null>(PRODUCT_PATHS_QUERY)
    .catch(() => null);

  if (!rows?.length) return [];
  return rows.map((row) => ({
    pageSlug: row.pageSlug,
    collectionSlug: row.collectionSlug,
    handle: row.handle,
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ pageSlug: string; collectionSlug: string; handle: string }>;
}): Promise<Metadata> {
  const { pageSlug, collectionSlug, handle } = await params;
  const product = await fetchProductByPath({ pageSlug, collectionSlug, handle });
  if (!product) return { title: "Product" };
  const title = product.seo?.metaTitle?.trim() || product.title;
  const description =
    product.seo?.metaDescription?.trim() ||
    plainTextFromBlocks(product.description);
  const og = product.seo?.ogImage;
  const ogUrl =
    og?.asset && "_ref" in og.asset && og.asset._ref
      ? urlFor(og).width(1200).height(630).fit("crop").url()
      : undefined;
  return {
    title,
    description,
    openGraph: ogUrl ? { images: [{ url: ogUrl }] } : undefined,
  };
}

async function fetchCapabilitiesForProduct(args: {
  landingPageId: string | null;
  collectionId: string | null;
}): Promise<CapabilityRow[]> {
  if (!isSanityConfigured()) return [];
  if (!args.landingPageId && !args.collectionId) return [];
  const client = await getSanityClient();
  const rows = await client
    .fetch<CapabilityRow[] | null>(CAPABILITIES_FOR_PRODUCT_REFS_QUERY, {
      landingPageId: args.landingPageId,
      collectionId: args.collectionId,
    })
    .catch(() => null);
  return rows ?? [];
}

function groupCapabilities(rows: CapabilityRow[]) {
  const order: Array<"material" | "finish"> = ["material", "finish"];
  return order
    .map((category) => {
      const options = rows
        .filter((row) => row.category === category)
        .map((row) => ({ value: row.slug || row._id, label: row.title }));
      return options.length
        ? { id: category, title: CATEGORY_TITLE[category], options }
        : null;
    })
    .filter((cat): cat is NonNullable<typeof cat> => cat !== null);
}

async function fetchProductByPath(args: {
  pageSlug: string;
  collectionSlug: string;
  handle: string;
}): Promise<ProductByPath | null> {
  if (!isSanityConfigured()) return null;
  const pageSlug = normalizeSegment(args.pageSlug);
  const collectionSlug = normalizeSegment(args.collectionSlug);
  const handle = normalizeHandle(args.handle);

  const client = await getSanityClient();
  return client
    .fetch<ProductByPath | null>(PRODUCT_BY_PATH_QUERY, {
      pageSlug,
      collectionSlug,
      handle,
    })
    .catch(() => null);
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ pageSlug: string; collectionSlug: string; handle: string }>;
}) {
  const { pageSlug, collectionSlug, handle } = await params;
  const product = await fetchProductByPath({ pageSlug, collectionSlug, handle });

  if (!product) notFound();

  // Map Sanity media to block image shape
  const images = (product.media ?? [])
    .filter((img) => img?.asset)
    .map((img, i) => ({
      src: urlFor(img).width(800).height(800).fit("max").url(),
      alt: img.alt?.trim() || product.title,
    }));

  // Fallback placeholder if no images
  const blockImages = images.length > 0 ? images : [
    { src: "https://placehold.co/800x800?text=No+Image", alt: product.title },
  ];

  // Breadcrumb: Landing Page > Collection > Product
  const breadcrumbData = [
    { label: "Products", href: "/products" },
    ...(product.primaryLandingPage
      ? [{ label: product.primaryLandingPage.title, href: `/products/${product.primaryLandingPage.slug}` }]
      : []),
    ...(product.primaryCollection
      ? [{ label: product.primaryCollection.title, href: `/products/${pageSlug}/${collectionSlug}` }]
      : []),
    { label: product.title },
  ];

  const productItem = {
    name: product.title,
    brand: product.primaryLandingPage?.title ?? "",
    itemSold: 0,
    description: plainTextFromBlocks(product.description) ?? "",
    totalReview: 0,
    storeLink: "#",
    rating: 0,
    price: 0,
    hasDiscount: false,
    images: blockImages,
    breadcrumbData,
  };

  const capabilityRows = await fetchCapabilitiesForProduct({
    landingPageId: product.landingPageId ?? null,
    collectionId: product.collectionId ?? null,
  });

  const capabilityCategories = groupCapabilities(capabilityRows);

  return (
    <ProductOverview
      productItems={[productItem]}
      capabilityCategories={capabilityCategories}
    />
  );
}
