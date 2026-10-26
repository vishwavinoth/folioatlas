/**
 * FolioAtlas — curated collection definitions (shared client/server).
 * Counts are always computed live over the real directory — never hardcoded.
 */
export type CollectionDef = {
  slug: string;
  label: string;
  description: string;
  techSlugs: string[];
};

export const COLLECTION_DEFS: CollectionDef[] = [
  {
    slug: "frontend-craft",
    label: "Frontend & UI",
    description: "Interface engineering, component systems and browser craft.",
    techSlugs: ["frontend", "react", "vue", "angular", "nextjs", "typescript", "design"],
  },
  {
    slug: "ai-ml",
    label: "AI & Machine Learning",
    description: "Developers building with models, data and intelligent tooling.",
    techSlugs: ["ai-ml", "data", "python"],
  },
  {
    slug: "backend-api",
    label: "Backend & APIs",
    description: "Server-side engineering, APIs and infrastructure.",
    techSlugs: ["backend", "nodejs", "python", "java", "dotnet", "php-laravel", "devops-cloud"],
  },
  {
    slug: "full-stack",
    label: "Full Stack",
    description: "End-to-end builders spanning client and server.",
    techSlugs: ["full-stack"],
  },
  {
    slug: "mobile",
    label: "Mobile",
    description: "iOS, Android and cross-platform app development.",
    techSlugs: ["mobile", "flutter"],
  },
  {
    slug: "emerging",
    label: "Emerging Tech",
    description: "Blockchain, game development and security engineering.",
    techSlugs: ["blockchain", "game-dev", "security"],
  },
];

export function collectionBySlug(slug: string): CollectionDef | null {
  return COLLECTION_DEFS.find((c) => c.slug === slug) ?? null;
}
