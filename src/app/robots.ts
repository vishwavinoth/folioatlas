import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site/index-data";

/**
 * Search engines and AI assistants are welcome on every page; only the JSON
 * API is off limits. Crawlers that match a named group ignore the "*" group,
 * so each group repeats the API rule. Non-production deployments are blocked.
 */
const AI_AGENTS = [
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "ClaudeBot",
  "Claude-User",
  "Claude-SearchBot",
  "PerplexityBot",
  "Perplexity-User",
  "Google-Extended",
  "Applebot-Extended",
  "Amazonbot",
  "CCBot",
  "DuckAssistBot",
  "MistralAI-User",
];

export default function robots(): MetadataRoute.Robots {
  const isProduction = (process.env.VERCEL_ENV ?? "production") === "production";
  if (!isProduction) return { rules: { userAgent: "*", disallow: "/" } };
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: "/api/" },
      { userAgent: AI_AGENTS, allow: "/", disallow: "/api/" },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
