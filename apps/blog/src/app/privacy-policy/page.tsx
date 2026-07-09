import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { PortableTextBlock } from "@portabletext/types";
import { PortableText } from "@/components/ui/portable-text";
import { getSanityClient } from "@/lib/sanity/client";
import { robotsDirectiveToMetadata } from "@/lib/seo";
import { absoluteUrl } from "@/lib/site";

export const revalidate = 60;

const PAGE_TITLE = "Privacy Policy";

type PrivacyPolicy = {
  lastUpdated?: string;
  body?: PortableTextBlock[];
  metaTitle?: string;
  metaDescription?: string;
};

const QUERY = `*[_type == "privacyPolicy"][0]{
  lastUpdated,
  body,
  metaTitle,
  metaDescription
}`;

async function getPrivacyPolicy(): Promise<PrivacyPolicy | null> {
  const client = await getSanityClient();
  return client.fetch<PrivacyPolicy | null>(QUERY);
}

export async function generateMetadata(): Promise<Metadata> {
  const doc = await getPrivacyPolicy();
  const canonical = absoluteUrl("/privacy-policy");
  const title = doc?.metaTitle || PAGE_TITLE;
  const description =
    doc?.metaDescription ||
    "How PakFactory collects, uses, and protects your personal data.";

  return {
    title,
    description,
    robots: robotsDirectiveToMetadata({ index: true, follow: true }),
    alternates: { canonical },
    openGraph: { title, description, url: canonical, type: "website" },
    twitter: { card: "summary", title, description },
  };
}

function formatDate(value?: string): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default async function PrivacyPolicyPage() {
  const doc = await getPrivacyPolicy();
  const hasBody = !!doc?.body?.length;

  // No published policy yet: in production 404 (don't index an empty legal
  // page); in dev render a placeholder so the route is visible while authoring.
  if (!hasBody && process.env.NODE_ENV === "production") notFound();

  const updated = formatDate(doc?.lastUpdated);

  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:py-16">
      <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
        {PAGE_TITLE}
      </h1>
      {updated && (
        <p className="mt-2 text-sm text-muted-foreground">
          Last updated: {updated}
        </p>
      )}
      {hasBody ? (
        <PortableText
          value={doc!.body}
          className="mt-8 text-base text-foreground"
        />
      ) : (
        <p className="mt-8 text-base text-muted-foreground">
          This privacy policy hasn’t been published yet. Add and{" "}
          <strong>publish</strong> it in Sanity Studio under Marketing Website →
          Static Pages → Legal → Privacy Policy.
        </p>
      )}
    </main>
  );
}
