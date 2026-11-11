import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "FolioAtlas — Developer Portfolio Directory",
    short_name: "FolioAtlas",
    description: "Search thousands of real developer portfolios, synced daily from the open-source developer-portfolios list.",
    start_url: "/",
    display: "standalone",
    background_color: "#101114",
    theme_color: "#0A84FF",
    categories: ["developer", "education", "productivity"],
    icons: [
      { src: "/icon.svg", type: "image/svg+xml", sizes: "any" },
      { src: "/icon-192.png", type: "image/png", sizes: "192x192" },
      { src: "/icon-512.png", type: "image/png", sizes: "512x512" },
      { src: "/icon-512.png", type: "image/png", sizes: "512x512", purpose: "maskable" },
    ],
  };
}
