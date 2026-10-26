import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site/index-data";

/** Only the production deployment is indexable; Vercel previews are not (PRD §11.1). */
export default function robots(): MetadataRoute.Robots {
  const isProduction = (process.env.VERCEL_ENV ?? "production") === "production";
  if (!isProduction) return { rules: { userAgent: "*", disallow: "/" } };
  return {
    rules: { userAgent: "*", allow: "/", disallow: "/api/" },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
