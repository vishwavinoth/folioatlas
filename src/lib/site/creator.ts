/**
 * The person who built FolioAtlas. Edit these values to change the credit
 * and contact call-to-action shown in the footer and on the About page.
 */
export const CREATOR = {
  name: "@vishwavinoth",
  profileUrl: "https://github.com/vishwavinoth",
  /** Call-to-action label for reaching the creator. */
  contactLabel: "Say hi on GitHub",
} as const;

/** Release stage shown as a badge in the navigation and a note in the footer. Set to null at launch. */
export const RELEASE_STAGE: string | null = "Beta";
