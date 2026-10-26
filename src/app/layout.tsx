import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/materials/theme-provider";

import { SITE_URL } from "@/lib/site/index-data";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "FolioAtlas — Discover Developer Portfolios",
    template: "%s | FolioAtlas",
  },
  description:
    "Explore real developer portfolios from an open-source directory. Search by developer name, portfolio URL, and primary focus areas.",
  applicationName: "FolioAtlas",
  keywords: [
    "developer portfolios",
    "portfolio directory",
    "developer inspiration",
    "web developer portfolio",
    "open source",
  ],
  openGraph: {
    title: "FolioAtlas — Discover Developer Portfolios",
    description:
      "One beautiful place to discover real developer portfolios, sourced from an open-source community directory.",
    siteName: "FolioAtlas",
    type: "website",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "FolioAtlas — discover real developer portfolios" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "FolioAtlas — Discover Developer Portfolios",
    description:
      "One beautiful place to discover real developer portfolios, sourced from an open-source community directory.",
    images: ["/og.png"],
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F5F5F7" },
    { media: "(prefers-color-scheme: dark)", color: "#101114" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased min-h-screen flex flex-col bg-background text-foreground">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:rounded-lg focus:bg-background focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:shadow-lg focus:border focus:border-border"
        >
          Skip to main content
        </a>
        <div className="ambient-backdrop" aria-hidden="true" />
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
