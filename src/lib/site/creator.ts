/**
 * The person who built FolioAtlas. Used by the footer, the About page and the
 * site's structured data (WebSite publisher). Values come from the public
 * GitHub profile; set `linkedinUrl` to show a LinkedIn link.
 */
export const CREATOR = {
  name: "Vishwa R",
  role: "Full Stack Developer",
  portfolioUrl: "https://vishwa.vercel.app",
  githubUrl: "https://github.com/vishwavinoth",
  linkedinUrl: null as string | null,
  /** The creator's own entry in the directory (their portfolio is listed upstream too). */
  directorySlug: "vishwa-r-9da2eb44",
} as const;

/** Profile links in display order (only the configured ones). */
export function creatorLinks(): Array<{ label: "Portfolio" | "GitHub" | "LinkedIn"; href: string }> {
  return [
    { label: "Portfolio" as const, href: CREATOR.portfolioUrl },
    { label: "GitHub" as const, href: CREATOR.githubUrl },
    ...(CREATOR.linkedinUrl ? [{ label: "LinkedIn" as const, href: CREATOR.linkedinUrl }] : []),
  ];
}

/** Release stage shown as a badge in the navigation and a note in the footer. Set to null at launch. */
export const RELEASE_STAGE: string | null = null;
