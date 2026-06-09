import type { Metadata } from "next";
import { draftMode } from "next/headers";
import { VisualEditing } from "next-sanity/visual-editing";
import { sitePath } from "@/lib/site";
import "./globals.css";

export const metadata: Metadata = {
  title: "PakFactory Blog",
  description: "Packaging insights, guides, and stories.",
  alternates: {
    types: {
      "application/rss+xml": [
        {
          url: sitePath("/rss.xml"),
          title: "PakFactory Blog",
        },
      ],
    },
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const isDraft = (await draftMode()).isEnabled;
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
        {isDraft && <VisualEditing />}
      </body>
    </html>
  );
}
