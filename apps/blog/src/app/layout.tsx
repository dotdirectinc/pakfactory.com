import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PakFactory Blog",
  description: "Packaging insights, guides, and stories.",
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
