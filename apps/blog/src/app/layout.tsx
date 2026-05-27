import type { Metadata } from "next";
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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
